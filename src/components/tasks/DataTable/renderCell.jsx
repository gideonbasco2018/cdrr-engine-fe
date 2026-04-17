/* ================================================================== */
/*  DataTable — renderCell.jsx                                         */
/* ================================================================== */
import { todayStr, countWorkingDays, getDeadlineUrgency, URGENCY_CONFIG } from "./constants";

const pill = (bg, shadow, text) => (
  <span style={{ display:"inline-flex", alignItems:"center", padding:"0.4rem 0.9rem", background:bg, color:"#fff", borderRadius:8, fontSize:"0.72rem", fontWeight:700, boxShadow:`0 2px 8px ${shadow}` }}>
    {text || "N/A"}
  </span>
);

const plainCell = (v, colors) =>
  v != null && v !== "" ? (
    <span style={{ fontSize:"0.78rem", color:colors?.tableText }}>{v}</span>
  ) : (
    <span style={{ color:colors?.textTertiary, fontSize:"0.78rem", fontStyle:"italic" }}>N/A</span>
  );

const wrapCell = (v, colors) =>
  v != null && v !== "" ? (
    <span style={{ fontSize:"0.78rem", color:colors?.tableText, whiteSpace:"normal", wordBreak:"break-word", lineHeight:1.5 }}>{v}</span>
  ) : (
    <span style={{ color:colors?.textTertiary, fontSize:"0.75rem", fontStyle:"italic" }}>N/A</span>
  );

const numCell = (v, colors) =>
  v != null && v !== "" ? (
    <span style={{ fontSize:"0.78rem", color:colors?.tableText, fontVariantNumeric:"tabular-nums" }}>{Number(v).toLocaleString()}</span>
  ) : (
    <span style={{ color:colors?.textTertiary, fontSize:"0.75rem", fontStyle:"italic" }}>—</span>
  );

export const renderDTN = (v) =>
  pill("linear-gradient(135deg,#8b5cf6,#7c3aed)", "rgba(139,92,246,.3)", v);

export const renderGenericName = (v) =>
  pill("linear-gradient(135deg,#06b6d4,#0891b2)", "rgba(6,182,212,.3)", v);

export const renderBrandName = (v) =>
  pill("linear-gradient(135deg,#f59e0b,#d97706)", "rgba(245,158,11,.3)", v);

export const renderTypeDoc = (typeDoc, colors) => {
  const u = typeDoc?.toUpperCase();
  if (u?.includes("CPR")) return pill("linear-gradient(135deg,#10b981,#059669)","rgba(16,185,129,.3)",typeDoc);
  if (u?.includes("LOD")) return pill("linear-gradient(135deg,#ef4444,#dc2626)","rgba(239,68,68,.3)",typeDoc);
  if (u?.includes("CERT")) return pill("linear-gradient(135deg,#3b82f6,#2563eb)","rgba(59,130,246,.3)",typeDoc);
  return <span style={{ fontSize:"0.85rem", color:colors?.tableText }}>{typeDoc || "N/A"}</span>;
};

export const renderStatus = (status) => {
  const u = status?.toUpperCase();
  const map = {
    COMPLETED: { bg:"linear-gradient(135deg,#10b981,#059669)", sh:"rgba(16,185,129,.3)", icon:"✓",  label:"Completed" },
    TO_DO:     { bg:"linear-gradient(135deg,#f59e0b,#d97706)", sh:"rgba(245,158,11,.3)", icon:"⏳", label:"To Do" },
    APPROVED:  { bg:"linear-gradient(135deg,#3b82f6,#2563eb)", sh:"rgba(59,130,246,.3)", icon:"✅", label:"Approved" },
    PENDING:   { bg:"linear-gradient(135deg,#eab308,#ca8a04)", sh:"rgba(234,179,8,.3)",  icon:"⏸", label:"Pending" },
    REJECTED:  { bg:"linear-gradient(135deg,#ef4444,#dc2626)", sh:"rgba(239,68,68,.3)",  icon:"✗",  label:"Rejected" },
  };
  const c = map[u] || { bg:"linear-gradient(135deg,#6b7280,#4b5563)", sh:"rgba(107,114,128,.3)", icon:"•", label:status||"N/A" };
  return (
    <span style={{ padding:"0.4rem 0.9rem", background:c.bg, color:"#fff", borderRadius:8, fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.5px", textTransform:"uppercase", boxShadow:`0 2px 8px ${c.sh}`, display:"inline-flex", alignItems:"center", gap:"0.4rem" }}>
      <span>{c.icon}</span>{c.label}
    </span>
  );
};

export const renderTimeline = (row, colors) => {
  const { dateReceivedCent, dateReleased, dbTimelineCitizenCharter: tl } = row;
  if (!dateReceivedCent || !tl || dateReceivedCent === "N/A" || tl === null)
    return <span style={{ color:colors?.textTertiary, fontSize:"0.8rem" }}>N/A</span>;
  const r = new Date(dateReceivedCent);
  const e = dateReleased && dateReleased !== "N/A" ? new Date(dateReleased) : new Date();
  if (isNaN(r) || isNaN(e)) return <span style={{ color:colors?.textTertiary, fontSize:"0.8rem" }}>N/A</span>;
  const d = Math.ceil(Math.abs(e - r) / 864e5);
  const ok = d <= parseInt(tl, 10);
  return (
    <span style={{ padding:"0.4rem 0.9rem", background:ok?"linear-gradient(135deg,#10b981,#059669)":"linear-gradient(135deg,#ef4444,#dc2626)", color:"#fff", borderRadius:8, fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.5px", textTransform:"uppercase", boxShadow:ok?"0 2px 8px rgba(16,185,129,.3)":"0 2px 8px rgba(239,68,68,.3)", display:"inline-flex", alignItems:"center", gap:"0.4rem" }}>
      <span>{ok ? "✓" : "⚠"}</span>{ok ? `Within (${d}d)` : `Beyond (${d}d)`}
    </span>
  );
};

export const renderDeadline = (row) => {
  const dl = row.deadlineDate;
  if (!dl) return <span style={{ color:"#6b7280", fontSize:"0.78rem", fontStyle:"italic" }}>—</span>;
  const urgency = getDeadlineUrgency(dl);
  const cfg = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.ok;
  const wdays = countWorkingDays(todayStr(), dl);
  const dateLabel = new Date(dl + "T00:00:00").toLocaleDateString("en-PH", { month:"short", day:"numeric", year:"numeric" });
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"0.25rem" }}>
      <span style={{ fontSize:"0.78rem", fontWeight:600, color:cfg.color }}>{cfg.icon} {dateLabel}</span>
      <span style={{ display:"inline-flex", alignItems:"center", padding:"0.15rem 0.5rem", background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:4, fontSize:"0.65rem", fontWeight:700, color:cfg.color, width:"fit-content" }}>
        {urgency === "overdue" ? "🚨 OVERDUE" : urgency === "today" ? "🔴 DUE TODAY" : `${wdays} working day${wdays !== 1 ? "s" : ""} left`}
      </span>
    </div>
  );
};

export const renderCell = (col, row, colors) => {
  const v = row[col.key];
  switch (col.key) {
    case "dtn":                   return renderDTN(v);
    case "prodGenName":           return renderGenericName(v);
    case "prodBrName":            return renderBrandName(v);
    case "appStatus":             return renderStatus(v);
    case "statusTimeline":        return renderTimeline(row, colors);
    case "typeDocReleased":       return renderTypeDoc(v, colors);
    case "deadlineDate":          return renderDeadline(row);
    case "attaReleased":          return renderTypeDoc(v, colors);
    case "dbTimelineCitizenCharter": return plainCell(v, colors);
    case "fee": case "lrf": case "surc": case "total": return numCell(v, colors);
    case "ammend1": case "ammend2": case "ammend3":    return plainCell(v, colors);
    case "cprCondRemarks": case "cprCondAddRemarks":
    case "appRemarks": case "remarks1":                return wrapCell(v, colors);
    case "cprCond":
      return v ? <span style={{ padding:"0.3rem 0.7rem", background:"linear-gradient(135deg,#7c3aed,#6d28d9)", color:"#fff", borderRadius:6, fontSize:"0.72rem", fontWeight:600, whiteSpace:"nowrap", boxShadow:"0 2px 6px rgba(124,58,237,0.3)", display:"inline-flex", alignItems:"center" }}>{v}</span> : plainCell(null, colors);
    case "secpa":
      return v ? <span style={{ padding:"0.3rem 0.7rem", background:"linear-gradient(135deg,#0891b2,#0e7490)", color:"#fff", borderRadius:6, fontSize:"0.72rem", fontWeight:600, whiteSpace:"nowrap", boxShadow:"0 2px 6px rgba(8,145,178,0.3)", display:"inline-flex", alignItems:"center" }}>{v}</span> : plainCell(null, colors);
    case "certification":
      return v ? <span style={{ padding:"0.3rem 0.7rem", background:"linear-gradient(135deg,#d97706,#b45309)", color:"#fff", borderRadius:6, fontSize:"0.72rem", fontWeight:600, whiteSpace:"nowrap", boxShadow:"0 2px 6px rgba(217,119,6,0.3)", display:"inline-flex", alignItems:"center" }}>{v}</span> : plainCell(null, colors);
    default: return plainCell(v, colors);
  }
};
