/* ================================================================== */
/*  DataTable — renderCell.jsx                                         */
/* ================================================================== */
import {
  todayStr,
  countWorkingDays,
  getDeadlineUrgency,
  URGENCY_CONFIG,
} from "./constants";

const pill = (bg, shadow, text) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "0.4rem 0.9rem",
      background: bg,
      color: "#fff",
      borderRadius: 8,
      fontSize: "0.72rem",
      fontWeight: 700,
      boxShadow: `0 2px 8px ${shadow}`,
    }}
  >
    {text || "N/A"}
  </span>
);

const plainCell = (v, colors) =>
  v != null && v !== "" ? (
    <span style={{ fontSize: "0.78rem", color: colors?.tableText }}>{v}</span>
  ) : (
    <span
      style={{
        color: colors?.textTertiary,
        fontSize: "0.78rem",
        fontStyle: "italic",
      }}
    >
      N/A
    </span>
  );

const wrapCell = (v, colors) =>
  v != null && v !== "" ? (
    <span
      style={{
        fontSize: "0.78rem",
        color: colors?.tableText,
        whiteSpace: "normal",
        wordBreak: "break-word",
        lineHeight: 1.5,
      }}
    >
      {v}
    </span>
  ) : (
    <span
      style={{
        color: colors?.textTertiary,
        fontSize: "0.75rem",
        fontStyle: "italic",
      }}
    >
      N/A
    </span>
  );

const numCell = (v, colors) =>
  v != null && v !== "" ? (
    <span
      style={{
        fontSize: "0.78rem",
        color: colors?.tableText,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {Number(v).toLocaleString()}
    </span>
  ) : (
    <span
      style={{
        color: colors?.textTertiary,
        fontSize: "0.75rem",
        fontStyle: "italic",
      }}
    >
      —
    </span>
  );

export const renderDTN = (v, colors) => {
  return v != null && v !== "" ? (
    <span
      style={{
        fontSize: "0.78rem",
        fontWeight: 600,
        color: colors?.tableText,
        fontFamily: "monospace",
      }}
    >
      {v}
    </span>
  ) : (
    <span
      style={{
        color: colors?.textTertiary,
        fontSize: "0.78rem",
        fontStyle: "italic",
      }}
    >
      N/A
    </span>
  );
};

export const renderGenericName = (v) =>
  pill("linear-gradient(135deg,#06b6d4,#0891b2)", "rgba(6,182,212,.3)", v);

export const renderBrandName = (v) =>
  pill("linear-gradient(135deg,#f59e0b,#d97706)", "rgba(245,158,11,.3)", v);

export const renderTypeDoc = (typeDoc, colors) => {
  const u = typeDoc?.toUpperCase();
  if (u?.includes("CPR"))
    return pill(
      "linear-gradient(135deg,#10b981,#059669)",
      "rgba(16,185,129,.3)",
      typeDoc,
    );
  if (u?.includes("LOD"))
    return pill(
      "linear-gradient(135deg,#ef4444,#dc2626)",
      "rgba(239,68,68,.3)",
      typeDoc,
    );
  if (u?.includes("CERT"))
    return pill(
      "linear-gradient(135deg,#3b82f6,#2563eb)",
      "rgba(59,130,246,.3)",
      typeDoc,
    );
  return (
    <span style={{ fontSize: "0.85rem", color: colors?.tableText }}>
      {typeDoc || "N/A"}
    </span>
  );
};

export const renderStatus = (status) => {
  const u = status?.toUpperCase();
  const map = {
    COMPLETED: {
      bg: "linear-gradient(135deg,#10b981,#059669)",
      sh: "rgba(16,185,129,.3)",
      icon: "✓",
      label: "Completed",
    },
    TO_DO: {
      bg: "linear-gradient(135deg,#f59e0b,#d97706)",
      sh: "rgba(245,158,11,.3)",
      icon: "⏳",
      label: "To Do",
    },
    APPROVED: {
      bg: "linear-gradient(135deg,#3b82f6,#2563eb)",
      sh: "rgba(59,130,246,.3)",
      icon: "✅",
      label: "Approved",
    },
    PENDING: {
      bg: "linear-gradient(135deg,#eab308,#ca8a04)",
      sh: "rgba(234,179,8,.3)",
      icon: "⏸",
      label: "Pending",
    },
    REJECTED: {
      bg: "linear-gradient(135deg,#ef4444,#dc2626)",
      sh: "rgba(239,68,68,.3)",
      icon: "✗",
      label: "Rejected",
    },
    "IN PROGRESS": {
      bg: "linear-gradient(135deg,#f59e0b,#d97706)",
      sh: "rgba(245,158,11,.3)",
      icon: "⏳",
      label: "In Progress",
    },
  };
  const c = map[u] || {
    bg: "linear-gradient(135deg,#6b7280,#4b5563)",
    sh: "rgba(107,114,128,.3)",
    icon: "•",
    label: status || "N/A",
  };
  return (
    <span
      style={{
        padding: "0.4rem 0.9rem",
        background: c.bg,
        color: "#fff",
        borderRadius: 8,
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        boxShadow: `0 2px 8px ${c.sh}`,
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
      }}
    >
      <span>{c.icon}</span>
      {c.label}
    </span>
  );
};

export const renderTimeline = (row, colors) => {
  const { dateReceivedCent, dateReleased, dbTimelineCitizenCharter: tl } = row;
  if (!dateReceivedCent || !tl || dateReceivedCent === "N/A" || tl === null)
    return (
      <span style={{ color: colors?.textTertiary, fontSize: "0.8rem" }}>
        N/A
      </span>
    );
  const r = new Date(dateReceivedCent);
  const e =
    dateReleased && dateReleased !== "N/A"
      ? new Date(dateReleased)
      : new Date();
  if (isNaN(r) || isNaN(e))
    return (
      <span style={{ color: colors?.textTertiary, fontSize: "0.8rem" }}>
        N/A
      </span>
    );
  const d = Math.ceil(Math.abs(e - r) / 864e5);
  const ok = d <= parseInt(tl, 10);
  return (
    <span
      style={{
        padding: "0.4rem 0.9rem",
        background: ok
          ? "linear-gradient(135deg,#10b981,#059669)"
          : "linear-gradient(135deg,#ef4444,#dc2626)",
        color: "#fff",
        borderRadius: 8,
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        boxShadow: ok
          ? "0 2px 8px rgba(16,185,129,.3)"
          : "0 2px 8px rgba(239,68,68,.3)",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
      }}
    >
      <span>{ok ? "✓" : "⚠"}</span>
      {ok ? `Within (${d}d)` : `Beyond (${d}d)`}
    </span>
  );
};

export const renderDeadline = (row) => {
  const dl = row.deadlineDate;
  if (!dl)
    return (
      <span
        style={{ color: "#6b7280", fontSize: "0.78rem", fontStyle: "italic" }}
      >
        —
      </span>
    );
  const urgency = getDeadlineUrgency(dl);
  const cfg = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.ok;
  const wdays = countWorkingDays(todayStr(), dl);
  const dateLabel = new Date(dl + "T00:00:00").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <span style={{ fontSize: "0.78rem", fontWeight: 600, color: cfg.color }}>
        {cfg.icon} {dateLabel}
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0.15rem 0.5rem",
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderRadius: 4,
          fontSize: "0.65rem",
          fontWeight: 700,
          color: cfg.color,
          width: "fit-content",
        }}
      >
        {urgency === "overdue"
          ? "🚨 OVERDUE"
          : urgency === "today"
            ? "🔴 DUE TODAY"
            : `${wdays} working day${wdays !== 1 ? "s" : ""} left`}
      </span>
    </div>
  );
};

// ── Application Step badge ────────────────────────────────────────────────────
const STEP_COLORS = {
  Decking: { bg: "#ede9fe", color: "#5b21b6" },
  "Quality Evaluation": { bg: "#fef3c7", color: "#92400e" },
  Compliance: { bg: "#dbeafe", color: "#1d4ed8" },
  Checking: { bg: "#dbeafe", color: "#1d4ed8" },
  Supervisor: { bg: "#fce7f3", color: "#be185d" },
  "QA Admin": { bg: "#d1fae5", color: "#065f46" },
  "LRD Chief Admin": { bg: "#fee2e2", color: "#991b1b" },
  "OD-Receiving": { bg: "#cffafe", color: "#0e7490" },
  "OD-Releasing": { bg: "#cffafe", color: "#0e7490" },
  "Releasing Officer": { bg: "#dcfce7", color: "#15803d" },
};

// col.key = "application_step"  →  v = row["application_step"]
export const renderApplicationStep = (v, colors) => {
  if (!v)
    return (
      <span
        style={{
          color: colors?.textTertiary,
          fontSize: "0.78rem",
          fontStyle: "italic",
        }}
      >
        N/A
      </span>
    );
  const s = STEP_COLORS[v] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.3rem 0.75rem",
        background: s.bg,
        color: s.color,
        borderRadius: 99,
        fontSize: "0.7rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {v}
    </span>
  );
};

// Update renderSentBy to handle "Surname, Firstname" format
export const renderSentBy = (v, colors) => {
  if (!v)
    return (
      <span
        style={{
          color: colors?.textTertiary,
          fontSize: "0.78rem",
          fontStyle: "italic",
        }}
      >
        N/A
      </span>
    );

  // Generate initials from "Surname, Firstname" or plain username
  const parts = v.replace(",", "").split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#6366f1,#4f46e5)",
          color: "#fff",
          fontSize: "0.6rem",
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {initials || "?"}
      </span>
      <span
        style={{
          fontSize: "0.78rem",
          color: colors?.tableText,
          whiteSpace: "nowrap",
        }}
      >
        {v}
      </span>
    </span>
  );
};

// col.key = "updated_at"  →  v = row["updated_at"]
export const renderLastModified = (v, colors) => {
  if (!v)
    return (
      <span
        style={{
          color: colors?.textTertiary,
          fontSize: "0.78rem",
          fontStyle: "italic",
        }}
      >
        N/A
      </span>
    );
  const d = new Date(v);
  if (isNaN(d))
    return (
      <span
        style={{
          color: colors?.textTertiary,
          fontSize: "0.78rem",
          fontStyle: "italic",
        }}
      >
        Invalid
      </span>
    );

  const dateStr = d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = d.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const ago =
    diffMin < 1
      ? "just now"
      : diffMin < 60
        ? `${diffMin}m ago`
        : diffHr < 24
          ? `${diffHr}h ago`
          : diffDay < 7
            ? `${diffDay}d ago`
            : dateStr;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontSize: "0.75rem",
          color: colors?.tableText,
          whiteSpace: "nowrap",
        }}
      >
        {dateStr}
      </span>
      <span
        style={{
          fontSize: "0.68rem",
          color: colors?.textTertiary,
          whiteSpace: "nowrap",
        }}
      >
        {timeStr} · <em>{ago}</em>
      </span>
    </div>
  );
};

export const renderEntryType = (v, colors) => {
  if (!v)
    return (
      <span
        style={{
          color: colors?.textTertiary,
          fontSize: "0.78rem",
          fontStyle: "italic",
        }}
      >
        —
      </span>
    );

  const STYLES = {
    ORIGINAL: {
      bg: "#dcfce7",
      color: "#15803d",
      darkBg: "rgba(16,185,129,0.15)",
      darkColor: "#34d399",
    },
    CORRECTION: {
      bg: "#fef9c3",
      color: "#a16207",
      darkBg: "rgba(245,158,11,0.15)",
      darkColor: "#fbbf24",
    },
    RECONSTRUCTION: {
      bg: "#fef2f2",
      color: "#b91c1c",
      darkBg: "rgba(239,68,68,0.15)",
      darkColor: "#f87171",
    },
  };

  const isDark =
    colors?.tableText?.startsWith("#e") ||
    colors?.tableText?.startsWith("#d") ||
    colors?.tableText === "#fff";
  const s = STYLES[v] ?? {
    bg: "#f3f4f6",
    color: "#374151",
    darkBg: "rgba(107,114,128,0.2)",
    darkColor: "#9ca3af",
  };

  return (
    <span
      style={{
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        padding: "3px 8px",
        borderRadius: 5,
        display: "inline-block",
        background: isDark ? s.darkBg : s.bg,
        color: isDark ? s.darkColor : s.color,
      }}
    >
      {v}
    </span>
  );
};
// ── Main cell dispatcher ──────────────────────────────────────────────────────
export const renderCell = (col, row, colors) => {
  const v = row[col.key]; // col.key is the exact field name from the API response
  switch (col.key) {
    case "dtn":
      return renderDTN(v, colors);
    case "entryType":
      return renderEntryType(v, colors);
    case "prodGenName":
      return renderGenericName(v);
    case "prodBrName":
      return renderBrandName(v);
    case "appStatus":
      return renderStatus(v);
    case "statusTimeline":
      return renderTimeline(row, colors);
    case "typeDocReleased":
      return renderTypeDoc(v, colors);
    case "deadlineDate":
      return renderDeadline(row);
    case "attaReleased":
      return renderTypeDoc(v, colors);
    case "dbTimelineCitizenCharter":
      return plainCell(v, colors);
    case "fee":
    case "lrf":
    case "surc":
    case "total":
      return numCell(v, colors);
    case "ammend1":
    case "ammend2":
    case "ammend3":
      return plainCell(v, colors);
    case "cprCondRemarks":
    case "cprCondAddRemarks":
    case "appRemarks":
    case "remarks1":
      return wrapCell(v, colors);
    case "cprCond":
      return v ? (
        <span
          style={{
            padding: "0.3rem 0.7rem",
            background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
            color: "#fff",
            borderRadius: 6,
            fontSize: "0.72rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 6px rgba(124,58,237,0.3)",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {v}
        </span>
      ) : (
        plainCell(null, colors)
      );
    case "secpa":
      return v ? (
        <span
          style={{
            padding: "0.3rem 0.7rem",
            background: "linear-gradient(135deg,#0891b2,#0e7490)",
            color: "#fff",
            borderRadius: 6,
            fontSize: "0.72rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 6px rgba(8,145,178,0.3)",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {v}
        </span>
      ) : (
        plainCell(null, colors)
      );
    case "certification":
      return v ? (
        <span
          style={{
            padding: "0.3rem 0.7rem",
            background: "linear-gradient(135deg,#d97706,#b45309)",
            color: "#fff",
            borderRadius: 6,
            fontSize: "0.72rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 6px rgba(217,119,6,0.3)",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {v}
        </span>
      ) : (
        plainCell(null, colors)
      );

    // ── application_logs columns — camelCase keys set by the data mapper ────
    // case "applicationStep":
    //   return renderApplicationStep(v, colors); // row["applicationStep"]
    case "sentBy":
      return renderSentBy(v, colors); // row["sentBy"]
    case "lastModified":
      return renderLastModified(v, colors); // row["lastModified"]
    // ─────────────────────────────────────────────────────────────────────

    default:
      return plainCell(v, colors);
  }
};
