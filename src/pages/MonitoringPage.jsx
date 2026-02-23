import { useState, useMemo, useRef, useEffect } from "react";

const evaluatorNames = [
  "Juan dela Cruz",
  "Maria Santos",
  "Pedro Reyes",
  "Ana Gonzales",
  "Jose Bautista",
  "Liza Reyes",
];
const appSteps = [
  "For Evaluation",
  "For Compliance",
  "For Checking",
  "For QA",
  "For Releasing",
];
const timelineOptions = ["Within", "Beyond"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// ── NEW: Prescription types ──
const PRESCRIPTION_TYPES = [
  "All",
  "Over-the-Counter (OTC)",
  "Vaccine",
  "Prescription Drug (RX)",
];
const PRESCRIPTION_KEYS = [
  "Over-the-Counter (OTC)",
  "Vaccine",
  "Prescription Drug (RX)",
];

// Realistic mix per year — approved + disapproved + onProcess
const yearlyMix = {
  2022: { approved: 38, disapproved: 22, onProcess: 15 },
  2023: { approved: 45, disapproved: 18, onProcess: 20 },
  2024: { approved: 52, disapproved: 25, onProcess: 18 },
  2025: { approved: 60, disapproved: 30, onProcess: 25 },
  2026: { approved: 20, disapproved: 8, onProcess: 30 },
};

// ── PATCHED: added prescription field to every row ──
function generateData() {
  const rows = [];
  let dtnCounter = 1;
  const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  Object.entries(yearlyMix).forEach(([yearStr, mix]) => {
    const year = Number(yearStr);
    const total = mix.approved + mix.disapproved + mix.onProcess;

    for (let i = 0; i < total; i++) {
      const month = (i % 12) + 1;
      const maxDay = monthDays[month - 1];
      const day = ((i * 3 + 1) % maxDay) + 1;
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      const status =
        i < mix.approved
          ? "Approved"
          : i < mix.approved + mix.disapproved
            ? "Disapproved"
            : "On Process";
      rows.push({
        date: `${year}-${mm}-${dd}`,
        evaluator: evaluatorNames[i % evaluatorNames.length],
        dtn: `DTN-${String(dtnCounter).padStart(4, "0")}`,
        appStep: appSteps[i % appSteps.length],
        timeline: timelineOptions[i % 2],
        status,
        prescription: PRESCRIPTION_KEYS[i % PRESCRIPTION_KEYS.length], // ← NEW
      });
      dtnCounter++;
    }
  });
  return rows;
}

const staticData = generateData();
const uniqueEvaluators = [...new Set(staticData.map((d) => d.evaluator))];

const stepColors = {
  "For Evaluation": { bg: "#dbeafe", color: "#1d4ed8" },
  "For Compliance": { bg: "#fef9c3", color: "#a16207" },
  "For Checking": { bg: "#dcfce7", color: "#15803d" },
  "For QA": { bg: "#f3e8ff", color: "#7e22ce" },
  "For Releasing": { bg: "#ffedd5", color: "#c2410c" },
};
const stepColorsDark = {
  "For Evaluation": { bg: "#1e2a4a", color: "#93c5fd" },
  "For Compliance": { bg: "#2a2000", color: "#fde68a" },
  "For Checking": { bg: "#0a2e1a", color: "#86efac" },
  "For QA": { bg: "#2a1a3e", color: "#d8b4fe" },
  "For Releasing": { bg: "#2e1500", color: "#fed7aa" },
};

const timelineColors = {
  Within: { bg: "#dcfce7", color: "#15803d" },
  Beyond: { bg: "#fef2f2", color: "#b91c1c" },
};
const timelineColorsDark = {
  Within: { bg: "#0a2e1a", color: "#4ade80" },
  Beyond: { bg: "#2e0a0a", color: "#f87171" },
};

const statusColors = {
  Approved: { bg: "#dcfce7", color: "#15803d" },
  Disapproved: { bg: "#fef2f2", color: "#b91c1c" },
  "On Process": { bg: "#fef9c3", color: "#a16207" },
};
const statusColorsDark = {
  Approved: { bg: "#0a2e1a", color: "#4ade80" },
  Disapproved: { bg: "#2e0a0a", color: "#f87171" },
  "On Process": { bg: "#2a2000", color: "#fde68a" },
};

// ── NEW: Prescription badge colors ──
const rxColors = {
  "Over-the-Counter (OTC)": { bg: "#e0f2fe", color: "#0369a1" },
  Vaccine: { bg: "#dcfce7", color: "#15803d" },
  "Prescription Drug (RX)": { bg: "#fef3c7", color: "#b45309" },
};
const rxColorsDark = {
  "Over-the-Counter (OTC)": { bg: "#0c2a3a", color: "#38bdf8" },
  Vaccine: { bg: "#0a2e1a", color: "#4ade80" },
  "Prescription Drug (RX)": { bg: "#2e1f00", color: "#fbbf24" },
};
function rxShortLabel(p) {
  return p === "Over-the-Counter (OTC)"
    ? "OTC"
    : p === "Prescription Drug (RX)"
      ? "RX"
      : "Vaccine";
}

// ── NEW: Chart Detail Modal ──
function ChartDetailModal({
  title,
  subtitle,
  rows,
  darkMode,
  onClose,
  border,
  textPrimary,
  textMuted,
  cardBg,
  colHeaderBg,
  rowHover,
  accent,
  inputBg,
  inputBorder,
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.dtn.toLowerCase().includes(q) ||
        r.evaluator.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.prescription.toLowerCase().includes(q) ||
        r.appStep.toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: cardBg,
          border: "1px solid " + border,
          borderRadius: "14px",
          overflow: "hidden",
          width: "940px",
          maxWidth: "96vw",
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "82vh",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid " + border,
            background: colHeaderBg,
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.68rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: textMuted,
                fontWeight: 700,
              }}
            >
              Chart Details
            </p>
            <h3
              style={{
                margin: "0.1rem 0 0",
                fontSize: "1.05rem",
                fontWeight: 700,
                color: textPrimary,
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                style={{
                  margin: "0.1rem 0 0",
                  fontSize: "0.74rem",
                  color: textMuted,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: inputBg,
                border: "1px solid " + inputBorder,
                borderRadius: "7px",
                padding: "0.35rem 0.8rem",
                fontSize: "0.8rem",
                color: textPrimary,
                outline: "none",
                width: "200px",
                colorScheme: darkMode ? "dark" : "light",
              }}
            />
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid " + border,
                borderRadius: "6px",
                color: textMuted,
                cursor: "pointer",
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowY: "auto", overflowX: "auto", flex: 1 }}>
          <div style={{ minWidth: "780px" }}>
            {/* Col headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "0.9fr 1.3fr 1fr 1.2fr 1.1fr 0.9fr",
                background: colHeaderBg,
                borderBottom: "1px solid " + border,
                position: "sticky",
                top: 0,
                zIndex: 2,
              }}
            >
              {[
                "DTN",
                "Evaluator",
                "Date",
                "Prescription",
                "App Step",
                "Status",
              ].map((col) => (
                <span
                  key={col}
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: textMuted,
                    padding: "0.55rem 0.9rem",
                    textAlign: "center",
                  }}
                >
                  {col}
                </span>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: textMuted,
                  fontSize: "0.84rem",
                }}
              >
                No records found
              </div>
            ) : (
              filtered.map((row, i) => {
                const sc = (darkMode ? statusColorsDark : statusColors)[
                  row.status
                ] || { bg: "#f3f4f6", color: "#374151" };
                const rxc = (darkMode ? rxColorsDark : rxColors)[
                  row.prescription
                ] || { bg: "#f3f4f6", color: "#374151" };
                const spc = (darkMode ? stepColorsDark : stepColors)[
                  row.appStep
                ] || { bg: "#f3f4f6", color: "#374151" };
                return (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "0.9fr 1.3fr 1fr 1.2fr 1.1fr 0.9fr",
                      borderBottom:
                        i < filtered.length - 1
                          ? "1px solid " + border
                          : "none",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = rowHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span
                      style={{
                        padding: "0.6rem 0.9rem",
                        fontSize: "0.8rem",
                        color: textMuted,
                        textAlign: "center",
                        fontWeight: 600,
                        alignSelf: "center",
                      }}
                    >
                      {row.dtn}
                    </span>
                    <span
                      style={{
                        padding: "0.6rem 0.9rem",
                        fontSize: "0.8rem",
                        color: textPrimary,
                        textAlign: "center",
                        fontWeight: 500,
                        alignSelf: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.35rem",
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background:
                            avatarColors[
                              uniqueEvaluators.indexOf(row.evaluator) %
                                avatarColors.length
                            ].color,
                          flexShrink: 0,
                        }}
                      />
                      {row.evaluator}
                    </span>
                    <span
                      style={{
                        padding: "0.6rem 0.9rem",
                        fontSize: "0.8rem",
                        color: textPrimary,
                        textAlign: "center",
                        alignSelf: "center",
                      }}
                    >
                      {new Date(row.date).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span
                      style={{
                        padding: "0.6rem 0.9rem",
                        textAlign: "center",
                        alignSelf: "center",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "0.18rem 0.6rem",
                          borderRadius: "99px",
                          background: rxc.bg,
                          color: rxc.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {rxShortLabel(row.prescription)}
                      </span>
                    </span>
                    <span
                      style={{
                        padding: "0.6rem 0.9rem",
                        textAlign: "center",
                        alignSelf: "center",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "0.18rem 0.6rem",
                          borderRadius: "99px",
                          background: spc.bg,
                          color: spc.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.appStep}
                      </span>
                    </span>
                    <span
                      style={{
                        padding: "0.6rem 0.9rem",
                        textAlign: "center",
                        alignSelf: "center",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "0.18rem 0.6rem",
                          borderRadius: "99px",
                          background: sc.bg,
                          color: sc.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.status}
                      </span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "0.55rem 1.25rem",
            borderTop: "1px solid " + border,
            background: colHeaderBg,
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "0.74rem", color: textMuted }}>
            {filtered.length !== rows.length
              ? `${filtered.length} of ${rows.length} records`
              : `${rows.length} record${rows.length !== 1 ? "s" : ""}`}
          </span>
          <button
            onClick={onClose}
            style={{
              padding: "0.35rem 0.9rem",
              fontSize: "0.8rem",
              fontWeight: 500,
              borderRadius: "6px",
              border: "1px solid " + border,
              background: "transparent",
              color: textMuted,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionMenu({
  task,
  darkMode,
  onReassign,
  border,
  textPrimary,
  textMuted,
  cardBg,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        style={{
          background: "transparent",
          border: "1px solid " + border,
          borderRadius: "6px",
          color: textMuted,
          cursor: "pointer",
          width: "28px",
          height: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1rem",
          letterSpacing: "1px",
          lineHeight: 1,
        }}
      >
        ···
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "32px",
            right: 0,
            background: cardBg,
            border: "1px solid " + border,
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            zIndex: 10,
            minWidth: "140px",
            overflow: "hidden",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onReassign(task);
            }}
            style={{
              width: "100%",
              padding: "0.55rem 0.9rem",
              background: "transparent",
              border: "none",
              textAlign: "left",
              fontSize: "0.82rem",
              color: textPrimary,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = darkMode
                ? "#1e1e1e"
                : "#f0f4ff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span>🔄</span> Re-assign
          </button>
        </div>
      )}
    </div>
  );
}

function ReassignModal({
  task,
  evaluators,
  darkMode,
  onClose,
  onConfirm,
  border,
  textPrimary,
  textMuted,
  cardBg,
  headerBg,
  inputBg,
  inputBorder,
}) {
  const [selected, setSelected] = useState("");
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: cardBg,
          border: "1px solid " + border,
          borderRadius: "12px",
          overflow: "hidden",
          width: "360px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid " + border,
            background: headerBg,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: textMuted,
                fontWeight: 600,
              }}
            >
              Re-assign Task
            </p>
            <h3
              style={{
                margin: 0,
                fontSize: "0.95rem",
                fontWeight: 700,
                color: textPrimary,
              }}
            >
              {task.dtn}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid " + border,
              borderRadius: "6px",
              color: textMuted,
              cursor: "pointer",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: "1.25rem" }}>
          <p
            style={{
              margin: "0 0 0.3rem",
              fontSize: "0.72rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: textMuted,
            }}
          >
            Current Evaluator
          </p>
          <p
            style={{
              margin: "0 0 1rem",
              fontSize: "0.88rem",
              color: textPrimary,
              fontWeight: 500,
            }}
          >
            {task.evaluator}
          </p>
          <label
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: textMuted,
              display: "block",
              marginBottom: "0.3rem",
            }}
          >
            Assign To
          </label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              width: "100%",
              background: inputBg,
              border: "1px solid " + inputBorder,
              borderRadius: "6px",
              padding: "0.45rem 0.7rem",
              fontSize: "0.84rem",
              color: textPrimary,
              outline: "none",
              colorScheme: darkMode ? "dark" : "light",
            }}
          >
            <option value="">— Select Evaluator —</option>
            {evaluators
              .filter((ev) => ev !== task.evaluator)
              .map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
          </select>
        </div>
        <div
          style={{
            padding: "0.9rem 1.25rem",
            borderTop: "1px solid " + border,
            background: headerBg,
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.6rem",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "0.4rem 0.9rem",
              fontSize: "0.82rem",
              borderRadius: "6px",
              border: "1px solid " + border,
              background: "transparent",
              color: textMuted,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onConfirm(task, selected)}
            disabled={!selected}
            style={{
              padding: "0.4rem 1rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              borderRadius: "6px",
              border: "none",
              background: selected
                ? "#4361ee"
                : darkMode
                  ? "#2a2a2a"
                  : "#e5e7eb",
              color: selected ? "#fff" : textMuted,
              cursor: selected ? "pointer" : "not-allowed",
              transition: "background 0.15s",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

const avatarColors = [
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#fce7f3", color: "#be185d" },
  { bg: "#d1fae5", color: "#065f46" },
  { bg: "#fef3c7", color: "#92400e" },
  { bg: "#ede9fe", color: "#5b21b6" },
  { bg: "#fee2e2", color: "#991b1b" },
  { bg: "#cffafe", color: "#0e7490" },
  { bg: "#fef9c3", color: "#713f12" },
];
function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}
function getAvatarColor(name, list) {
  return avatarColors[list.indexOf(name) % avatarColors.length];
}

/* ── Premium SVG Bar Chart — NOW CLICKABLE ── */
function SVGBarChart({
  data,
  darkMode,
  textMuted,
  textPrimary,
  gridColor,
  cardBg,
  border,
  onBarClick,
}) {
  const [hovered, setHovered] = useState(null);
  const W = 340,
    H = 160,
    padL = 32,
    padR = 14,
    padT = 16,
    padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.Approved, d.Disapproved, d.OnProcess || 0)),
    1,
  );
  const roundedMax = Math.ceil(maxVal / 10) * 10;
  const barGroupW = innerW / data.length;
  const barW = Math.min(Math.floor(barGroupW * 0.22), 12);
  const gap = 3;
  const yTicks = 5;
  const BARS = [
    { key: "Approved", color: "#4361ee", gradId: "gradA", light: "#6c8af4" },
    { key: "Disapproved", color: "#f43f5e", gradId: "gradD", light: "#f87191" },
    { key: "OnProcess", color: "#f59e0b", gradId: "gradO", light: "#fbbf24" },
  ];

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          overflow: "visible",
        }}
      >
        <defs>
          {BARS.map((b) => (
            <linearGradient
              key={b.gradId}
              id={b.gradId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={b.light} />
              <stop offset="100%" stopColor={b.color} />
            </linearGradient>
          ))}
          <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Grid + Y axis labels */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = padT + (innerH / yTicks) * i;
          const val = Math.round(roundedMax - (roundedMax / yTicks) * i);
          return (
            <g key={i}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                stroke={
                  darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"
                }
                strokeWidth={i === yTicks ? 1.5 : 1}
                strokeDasharray={i === yTicks ? "0" : "4 4"}
              />
              <text
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                fill={textMuted}
                fontSize={8}
                fontFamily="system-ui"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const cx = padL + barGroupW * i + barGroupW / 2;
          const isHov = hovered === i;
          const totalBarW = barW * 3 + gap * 2;
          const startX = cx - totalBarW / 2;

          return (
            <g
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Hover highlight column */}
              <rect
                x={padL + barGroupW * i + 2}
                y={padT}
                width={barGroupW - 4}
                height={innerH}
                fill={
                  isHov
                    ? darkMode
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(67,97,238,0.05)"
                    : "transparent"
                }
                rx={6}
              />

              {BARS.map((b, bi) => {
                const rawVal =
                  b.key === "OnProcess" ? d.OnProcess || 0 : d[b.key];
                const bH = (rawVal / roundedMax) * innerH;
                const bX = startX + bi * (barW + gap);
                const bY = padT + innerH - bH;
                if (rawVal === 0) return null;
                return (
                  // ← PATCHED: each bar is now clickable
                  <g
                    key={b.key}
                    onClick={() => onBarClick(d.label, b.key)}
                    style={{ cursor: "pointer" }}
                  >
                    <rect
                      x={bX + 1}
                      y={bY + 3}
                      width={barW}
                      height={bH}
                      fill={b.color}
                      opacity={0.15}
                      rx={4}
                    />
                    <rect
                      x={bX}
                      y={bY}
                      width={barW}
                      height={bH}
                      fill={`url(#${b.gradId})`}
                      rx={4}
                      style={{ transition: "opacity 0.15s" }}
                      opacity={isHov ? 1 : 0.9}
                    />
                    <rect
                      x={bX + 2}
                      y={bY + 2}
                      width={barW - 4}
                      height={Math.min(6, bH - 4)}
                      fill="white"
                      opacity={0.2}
                      rx={2}
                    />
                    <text
                      x={bX + barW / 2}
                      y={bY - 4}
                      textAnchor="middle"
                      fill={b.color}
                      fontSize={8}
                      fontWeight={700}
                      fontFamily="system-ui"
                      opacity={isHov ? 1 : 0.85}
                    >
                      {rawVal}
                    </text>
                  </g>
                );
              })}

              <text
                x={cx}
                y={H - 8}
                textAnchor="middle"
                fill={textMuted}
                fontSize={9}
                fontFamily="system-ui"
                fontWeight={isHov ? 700 : 400}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating tooltip */}
      {hovered !== null && data[hovered] && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "none",
            zIndex: 20,
            background: darkMode
              ? "rgba(20,20,30,0.96)"
              : "rgba(255,255,255,0.98)",
            border: "1px solid " + border,
            borderRadius: "12px",
            padding: "0.7rem 1rem",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
            backdropFilter: "blur(8px)",
            minWidth: "155px",
          }}
        >
          <p
            style={{
              margin: "0 0 0.3rem",
              fontWeight: 700,
              color: textPrimary,
              fontSize: "0.82rem",
              letterSpacing: "-0.01em",
            }}
          >
            {data[hovered].label}
          </p>
          <p
            style={{
              margin: "0 0 0.4rem",
              fontSize: "0.69rem",
              color: textMuted,
              fontStyle: "italic",
            }}
          >
            Click a bar to view records
          </p>
          {BARS.map((b) => {
            const val =
              b.key === "OnProcess"
                ? data[hovered].OnProcess || 0
                : data[hovered][b.key];
            return (
              <div
                key={b.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  marginBottom: "0.2rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: b.color,
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: "0.75rem", color: textMuted }}>
                    {b.key === "OnProcess" ? "On Process" : b.key}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: b.color,
                  }}
                >
                  {val}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1.4rem",
          marginTop: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        {BARS.map((b) => (
          <div
            key={b.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.75rem",
              color: textMuted,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: `linear-gradient(to bottom, ${b.light}, ${b.color})`,
                display: "inline-block",
                boxShadow: `0 1px 4px ${b.color}55`,
              }}
            />
            <span style={{ fontWeight: 500 }}>
              {b.key === "OnProcess" ? "On Process" : b.key}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Premium SVG Donut Chart — NOW CLICKABLE ── */
function SVGDonutChart({
  data,
  textMuted,
  textPrimary,
  darkMode,
  onSliceClick,
}) {
  const [active, setActive] = useState(null);
  const cx = 110,
    cy = 110,
    r = 85,
    ri = 58;
  const total = data.reduce((s, d) => s + d.value, 0);
  const PALETTE = [
    { color: "#4361ee", light: "#6c8af4", glow: "rgba(67,97,238,0.35)" },
    { color: "#f43f5e", light: "#f87191", glow: "rgba(244,63,94,0.35)" },
    { color: "#f59e0b", light: "#fbbf24", glow: "rgba(245,158,11,0.35)" },
  ];

  let startAngle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const angle = total === 0 ? 0 : (d.value / total) * 2 * Math.PI;
    const slice = {
      ...d,
      startAngle,
      endAngle: startAngle + angle,
      ...PALETTE[i],
    };
    startAngle += angle;
    return slice;
  });

  function arcPath(sa, ea, outerR, innerR) {
    if (Math.abs(ea - sa) < 0.001) return "";
    const x1o = cx + outerR * Math.cos(sa),
      y1o = cy + outerR * Math.sin(sa);
    const x2o = cx + outerR * Math.cos(ea),
      y2o = cy + outerR * Math.sin(ea);
    const x1i = cx + innerR * Math.cos(ea),
      y1i = cy + innerR * Math.sin(ea);
    const x2i = cx + innerR * Math.cos(sa),
      y2i = cy + innerR * Math.sin(sa);
    const large = ea - sa > Math.PI ? 1 : 0;
    return `M ${x1o} ${y1o} A ${outerR} ${outerR} 0 ${large} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${innerR} ${innerR} 0 ${large} 0 ${x2i} ${y2i} Z`;
  }

  const activeIdx = active !== null ? active : 0;
  const activeSlice = slices[activeIdx];
  const pct =
    total > 0 ? ((activeSlice?.value / total) * 100).toFixed(1) : "0.0";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="0 0 220 220"
        style={{
          width: "100%",
          maxWidth: 300,
          height: "auto",
          overflow: "visible",
        }}
      >
        <defs>
          {PALETTE.map((p, i) => (
            <linearGradient
              key={i}
              id={`donutGrad${i}`}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0%" stopColor={p.light} />
              <stop offset="100%" stopColor={p.color} />
            </linearGradient>
          ))}
          <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx={cx}
          cy={cy}
          r={(r + ri) / 2}
          fill="none"
          stroke={darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}
          strokeWidth={r - ri + 2}
        />

        {slices.map((s, i) => {
          const isActive = i === activeIdx;
          const outerR = isActive ? r + 9 : r;
          const innerR = isActive ? ri - 3 : ri;
          return (
            // ← PATCHED: slices are now clickable
            <g
              key={i}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => onSliceClick(s.name)}
              style={{ cursor: "pointer" }}
            >
              {isActive && (
                <path
                  d={arcPath(s.startAngle, s.endAngle, outerR + 4, innerR - 4)}
                  fill={s.color}
                  opacity={0.2}
                  filter="url(#glowFilter)"
                />
              )}
              <path
                d={arcPath(s.startAngle, s.endAngle, outerR, innerR)}
                fill={`url(#donutGrad${i})`}
                style={{
                  transition: "all 0.25s cubic-bezier(.34,1.56,.64,1)",
                  filter: isActive
                    ? `drop-shadow(0 4px 10px ${s.glow})`
                    : "none",
                }}
              />
              <path
                d={arcPath(
                  s.startAngle,
                  s.startAngle + (s.endAngle - s.startAngle) * 0.4,
                  outerR - 2,
                  outerR - 8,
                )}
                fill="white"
                opacity={isActive ? 0.18 : 0.1}
              />
            </g>
          );
        })}

        <circle
          cx={cx}
          cy={cy}
          r={ri - 6}
          fill={darkMode ? "rgba(22,22,22,0.95)" : "rgba(255,255,255,0.95)"}
        />
        <text
          x={cx}
          y={cy - 16}
          textAnchor="middle"
          fill={activeSlice?.color}
          fontSize={24}
          fontWeight={800}
          fontFamily="system-ui"
          letterSpacing="-1"
        >
          {activeSlice?.value ?? 0}
        </text>
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fill={textMuted}
          fontSize={9.5}
          fontFamily="system-ui"
          fontWeight={600}
          textDecoration="none"
        >
          {activeSlice?.name?.toUpperCase()}
        </text>
        <text
          x={cx}
          y={cy + 20}
          textAnchor="middle"
          fill={activeSlice?.color}
          fontSize={13}
          fontWeight={700}
          fontFamily="system-ui"
        >
          {pct}%
        </text>
        <text
          x={cx}
          y={cy + 35}
          textAnchor="middle"
          fill={textMuted}
          fontSize={7.5}
          fontFamily="system-ui"
          fontStyle="italic"
        >
          click slice for details
        </text>
      </svg>

      {/* Legend cards — also clickable */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          width: "100%",
          marginTop: "1rem",
          padding: "0 0.5rem",
        }}
      >
        {slices.map((s, i) => {
          const pctVal =
            total > 0 ? ((s.value / total) * 100).toFixed(1) : "0.0";
          const isActive = i === activeIdx;
          return (
            <div
              key={s.name}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => onSliceClick(s.name)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "8px",
                cursor: "pointer",
                background: isActive
                  ? darkMode
                    ? `${s.color}18`
                    : `${s.color}10`
                  : "transparent",
                border: `1px solid ${isActive ? s.color + "44" : "transparent"}`,
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 32,
                  borderRadius: 4,
                  background: `linear-gradient(to bottom, ${s.light}, ${s.color})`,
                  flexShrink: 0,
                  boxShadow: isActive ? `0 2px 8px ${s.glow}` : "none",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "0.2rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: isActive ? s.color : textMuted,
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 800,
                      color: s.color,
                    }}
                  >
                    {s.value}
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 99,
                    background: darkMode
                      ? "rgba(255,255,255,0.07)"
                      : "rgba(0,0,0,0.07)",
                  }}
                >
                  <div
                    style={{
                      height: 4,
                      borderRadius: 99,
                      width: `${pctVal}%`,
                      background: `linear-gradient(to right, ${s.light}, ${s.color})`,
                      boxShadow: isActive ? `0 0 6px ${s.glow}` : "none",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: isActive ? s.color : textMuted,
                  minWidth: "36px",
                  textAlign: "right",
                }}
              >
                {pctVal}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonitoringPage({ darkMode, userRole }) {
  // ── PATCHED: light grey bg in light mode (was "#f0f2f7") ──
  const bg = darkMode ? "#0a0a0a" : "#f8f8f8";
  const cardBg = darkMode ? "#161616" : "#ffffff";
  const border = darkMode ? "#2a2a2a" : "#e2e5ee";
  const textPrimary = darkMode ? "#f5f5f5" : "#1a1f36";
  const textMuted = darkMode ? "#6b7280" : "#131212";
  const headerBg = darkMode ? "#1a1a1a" : "#f6f8fd";
  const rowHover = darkMode ? "#1e1e1e" : "#f0f4ff";
  const inputBg = darkMode ? "#1a1a1a" : "#ffffff";
  const inputBorder = darkMode ? "#2e2e2e" : "#cdd2e0";
  const accent = darkMode ? "#2563eb" : "#4361ee";
  const gridColor = darkMode ? "#2a2a2a" : "#e8ecf5";
  const colHeaderBg = darkMode
    ? headerBg
    : "linear-gradient(to bottom, #ffffff, #ffffff)";
  // ── NEW: segmented control background ──
  const segmentBg = darkMode ? "#1e1e1e" : "#e2e5ee";

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [evaluatorFilter, setEvaluatorFilter] = useState("");
  const [modalEvaluator, setModalEvaluator] = useState(null);
  const [modalDateFrom, setModalDateFrom] = useState("");
  const [modalDateTo, setModalDateTo] = useState("");
  const [reassignTask, setReassignTask] = useState(null);
  const [tableData, setTableData] = useState(staticData);
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [modalSortCol, setModalSortCol] = useState("date");
  const [modalSortDir, setModalSortDir] = useState("asc");
  const PAGE_SIZE = 10;

  const [chartYear, setChartYear] = useState("All");
  const [chartMonth, setChartMonth] = useState("All");
  const [chartDay, setChartDay] = useState("All");
  // ── NEW: prescription filter state (analytics only) ──
  const [rxFilter, setRxFilter] = useState("All");
  // ── NEW: chart detail modal state ──
  const [chartModal, setChartModal] = useState(null); // { title, subtitle, rows }

  const availableYears = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(staticData.map((d) => new Date(d.date).getFullYear())),
      ).sort(),
    ],
    [],
  );

  // ── PATCHED: prescription filter applied here (analytics only) ──
  const chartFilteredData = useMemo(() => {
    return tableData.filter((row) => {
      const d = new Date(row.date);
      if (chartYear !== "All" && d.getFullYear() !== Number(chartYear))
        return false;
      if (chartMonth !== "All" && d.getMonth() !== Number(chartMonth))
        return false;
      if (chartDay !== "All" && d.getDate() !== Number(chartDay)) return false;
      if (rxFilter !== "All" && row.prescription !== rxFilter) return false; // ← NEW
      return true;
    });
  }, [tableData, chartYear, chartMonth, chartDay, rxFilter]);

  const barData = useMemo(() => {
    const groups = {};
    chartFilteredData.forEach((row) => {
      const d = new Date(row.date);
      let key;
      if (chartYear === "All") key = String(d.getFullYear());
      else if (chartMonth === "All") key = MONTHS[d.getMonth()];
      else key = String(d.getDate()).padStart(2, "0");
      if (!groups[key])
        groups[key] = { label: key, Approved: 0, Disapproved: 0, OnProcess: 0 };
      if (row.status === "Approved") groups[key].Approved++;
      else if (row.status === "Disapproved") groups[key].Disapproved++;
      else if (row.status === "On Process") groups[key].OnProcess++;
    });
    const keys = Object.keys(groups);
    if (chartYear === "All")
      return keys.sort((a, b) => Number(a) - Number(b)).map((k) => groups[k]);
    if (chartMonth === "All")
      return MONTHS.filter((m) => groups[m]).map((m) => groups[m]);
    return keys.sort((a, b) => Number(a) - Number(b)).map((k) => groups[k]);
  }, [chartFilteredData, chartYear, chartMonth]);

  const pieData = useMemo(() => {
    const approved = chartFilteredData.filter(
      (r) => r.status === "Approved",
    ).length;
    const disapproved = chartFilteredData.filter(
      (r) => r.status === "Disapproved",
    ).length;
    const onProcess = chartFilteredData.filter(
      (r) => r.status === "On Process",
    ).length;
    return [
      { name: "Approved", value: approved },
      { name: "Disapproved", value: disapproved },
      { name: "On Process", value: onProcess },
    ];
  }, [chartFilteredData]);

  const totalApproved = pieData[0]?.value || 0;
  const totalDisapproved = pieData[1]?.value || 0;
  const totalOnProcess = pieData[2]?.value || 0;

  const availableMonths = useMemo(() => {
    if (chartYear === "All") return [];
    const ms = new Set(
      tableData
        .filter((r) => new Date(r.date).getFullYear() === Number(chartYear))
        .map((r) => new Date(r.date).getMonth()),
    );
    return Array.from(ms).sort((a, b) => a - b);
  }, [tableData, chartYear]);

  const availableDays = useMemo(() => {
    if (chartYear === "All" || chartMonth === "All") return [];
    const ds = new Set(
      tableData
        .filter((r) => {
          const d = new Date(r.date);
          return (
            d.getFullYear() === Number(chartYear) &&
            d.getMonth() === Number(chartMonth)
          );
        })
        .map((r) => new Date(r.date).getDate()),
    );
    return Array.from(ds).sort((a, b) => a - b);
  }, [tableData, chartYear, chartMonth]);

  // Records table — NO prescription filter (independent)
  const filtered = useMemo(() => {
    setPage(1);
    const f = tableData.filter((row) => {
      const rowDate = new Date(row.date);
      if (dateFrom && rowDate < new Date(dateFrom)) return false;
      if (dateTo && rowDate > new Date(dateTo)) return false;
      if (evaluatorFilter && row.evaluator !== evaluatorFilter) return false;
      return true;
    });
    return [...f].sort((a, b) => {
      let av = a[sortCol],
        bv = b[sortCol];
      if (sortCol === "date") {
        av = new Date(av);
        bv = new Date(bv);
      } else {
        av = av.toLowerCase();
        bv = bv.toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [dateFrom, dateTo, evaluatorFilter, tableData, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");
    setEvaluatorFilter("");
    setPage(1);
  };
  const handleModalClose = () => {
    setModalEvaluator(null);
    setModalDateFrom("");
    setModalDateTo("");
    setModalSortCol("date");
    setModalSortDir("asc");
  };

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };
  const toggleModalSort = (col) => {
    if (modalSortCol === col)
      setModalSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setModalSortCol(col);
      setModalSortDir("asc");
    }
  };

  const SortIcon = ({ col, active, dir }) => (
    <span
      style={{
        marginLeft: "4px",
        fontSize: "0.65rem",
        opacity: active ? 1 : 0.3,
        color: active ? accent : "inherit",
      }}
    >
      {active ? (dir === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );

  const handleReassignConfirm = (task, newEvaluator) => {
    setTableData((prev) =>
      prev.map((r) =>
        r.dtn === task.dtn ? { ...r, evaluator: newEvaluator } : r,
      ),
    );
    setReassignTask(null);
  };

  const currentEvaluators = [...new Set(tableData.map((d) => d.evaluator))];
  const allModalTasks = modalEvaluator
    ? tableData.filter((d) => d.evaluator === modalEvaluator)
    : [];

  const modalTasks = useMemo(() => {
    const f = allModalTasks.filter((task) => {
      const d = new Date(task.date);
      if (modalDateFrom && d < new Date(modalDateFrom)) return false;
      if (modalDateTo && d > new Date(modalDateTo)) return false;
      return true;
    });
    return [...f].sort((a, b) => {
      let av = a[modalSortCol],
        bv = b[modalSortCol];
      if (modalSortCol === "date") {
        av = new Date(av);
        bv = new Date(bv);
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      if (av < bv) return modalSortDir === "asc" ? -1 : 1;
      if (av > bv) return modalSortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [allModalTasks, modalDateFrom, modalDateTo, modalSortCol, modalSortDir]);

  // ── NEW: bar click handler ──
  const handleBarClick = (label, statusKey) => {
    const statusLabel = statusKey === "OnProcess" ? "On Process" : statusKey;
    const rows = chartFilteredData.filter((row) => {
      const d = new Date(row.date);
      let key;
      if (chartYear === "All") key = String(d.getFullYear());
      else if (chartMonth === "All") key = MONTHS[d.getMonth()];
      else key = String(d.getDate()).padStart(2, "0");
      return key === label && row.status === statusLabel;
    });
    setChartModal({
      title: `${label} · ${statusLabel}`,
      subtitle: rxFilter !== "All" ? `Prescription: ${rxFilter}` : undefined,
      rows,
    });
  };

  // ── NEW: donut slice click handler ──
  const handleSliceClick = (statusName) => {
    setChartModal({
      title: statusName,
      subtitle: rxFilter !== "All" ? `Prescription: ${rxFilter}` : undefined,
      rows: chartFilteredData.filter((r) => r.status === statusName),
    });
  };

  const inputStyle = {
    background: inputBg,
    border: "1px solid " + inputBorder,
    borderRadius: "6px",
    padding: "0.4rem 0.65rem",
    fontSize: "0.82rem",
    color: textPrimary,
    outline: "none",
    colorScheme: darkMode ? "dark" : "light",
  };
  const labelStyle = {
    fontSize: "0.72rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: textMuted,
    marginBottom: "0.3rem",
    display: "block",
  };
  const cardStyle = {
    background: cardBg,
    border: "1px solid " + border,
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: darkMode
      ? "0 2px 12px rgba(0,0,0,0.4)"
      : "0 4px 20px rgba(67,97,238,0.08), 0 1px 4px rgba(0,0,0,0.06)",
  };

  const statItems = [
    {
      label: "Total Received",
      value: chartFilteredData.length,
      color: accent,
      bg: darkMode ? "#1a2744" : accent + "12",
    },
    {
      label: "Approved",
      value: totalApproved,
      color: "#22c55e",
      bg: darkMode ? "#0f2e1a" : "#f0fdf4",
    },
    {
      label: "Disapproved",
      value: totalDisapproved,
      color: "#f43f5e",
      bg: darkMode ? "#2e0f1a" : "#fff1f3",
    },
    {
      label: "On Process",
      value: totalOnProcess,
      color: "#f59e0b",
      bg: darkMode ? "#2e1f00" : "#fffbeb",
    },
    {
      label: "Approval Rate",
      value: chartFilteredData.length
        ? `${((totalApproved / chartFilteredData.length) * 100).toFixed(1)}%`
        : "—",
      color: darkMode ? "#a78bfa" : "#7c3aed",
      bg: darkMode ? "#1e1a2e" : "#f5f3ff",
    },
  ];

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        background: bg,
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Page Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            marginBottom: "0.25rem",
          }}
        >
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: "600",
              marginBottom: "0.5rem",
              transition: "color 0.3s ease",
            }}
          >
            Monitoring
          </h1>
        </div>
        <p
          style={{
            color: textMuted,
            fontSize: "0.85rem",
            margin: 0,
            paddingLeft: "0.25rem",
          }}
        >
          Track evaluation activity and assigned evaluators
        </p>
      </div>

      {/* Evaluators + Records */}
      <div
        style={{
          display: "flex",
          gap: "1.25rem",
          alignItems: "stretch",
          flexWrap: "wrap",
        }}
      >
        {/* LEFT — Tasks per Evaluator */}
        <div
          style={{
            flex: "0 0 280px",
            minWidth: "240px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ marginBottom: "0.6rem" }}>
            <h2
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: textPrimary,
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Current Tasks per Evaluator
            </h2>
            <p
              style={{
                fontSize: "0.78rem",
                color: textMuted,
                margin: "0.15rem 0 0",
              }}
            >
              Click a row to view task details
            </p>
          </div>
          <div
            style={{
              ...cardStyle,
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 60px",
                background: colHeaderBg,
                borderBottom: "1px solid " + border,
                padding: "0.6rem 1rem",
              }}
            >
              {["Evaluator", "Tasks"].map((col, i) => (
                <span
                  key={col}
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: textMuted,
                    ...(i === 1 ? { textAlign: "center" } : {}),
                  }}
                >
                  {col}
                </span>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              {currentEvaluators.map((ev, i) => {
                const count = tableData.filter(
                  (d) => d.evaluator === ev,
                ).length;
                const maxCount = Math.max(
                  ...currentEvaluators.map(
                    (e) => tableData.filter((d) => d.evaluator === e).length,
                  ),
                );
                const pct = (count / maxCount) * 100;
                const av = getAvatarColor(ev, uniqueEvaluators);
                return (
                  <div
                    key={ev}
                    onClick={() => setModalEvaluator(ev)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 60px",
                      padding: "0.55rem 1rem",
                      borderBottom:
                        i < currentEvaluators.length - 1
                          ? "1px solid " + border
                          : "none",
                      transition: "background 0.15s",
                      cursor: "pointer",
                      alignItems: "center",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = rowHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: av.bg,
                          color: av.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          border: "1.5px solid " + av.color + "33",
                        }}
                      >
                        {getInitials(ev)}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.3rem",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 500,
                            color: textPrimary,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {ev}
                        </span>
                        <div
                          style={{
                            height: "3px",
                            borderRadius: "99px",
                            background: darkMode ? border : "#e8ecf5",
                          }}
                        >
                          <div
                            style={{
                              height: "3px",
                              borderRadius: "99px",
                              background: av.color,
                              width: pct + "%",
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        color: accent,
                        textAlign: "center",
                      }}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                padding: "0.5rem 1rem",
                borderTop: "1px solid " + border,
                background: colHeaderBg,
              }}
            >
              <span style={{ fontSize: "0.75rem", color: textMuted }}>
                {currentEvaluators.length} evaluators · {tableData.length} total
                tasks
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT — Records */}
        <div
          style={{
            flex: "1 1 360px",
            minWidth: "320px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ marginBottom: "0.6rem" }}>
            <h2
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: textPrimary,
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Records
            </h2>
            <p
              style={{
                fontSize: "0.78rem",
                color: textMuted,
                margin: "0.15rem 0 0",
              }}
            >
              All evaluation records
            </p>
          </div>
          <div
            style={{
              ...cardStyle,
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Filters */}
            <div
              style={{
                padding: "0.75rem 1rem",
                borderBottom: "1px solid " + border,
                background: colHeaderBg,
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: "120px" }}>
                <label style={labelStyle}>From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ minWidth: "120px" }}>
                <label style={labelStyle}>To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ minWidth: "150px" }}>
                <label style={labelStyle}>Evaluator</label>
                <select
                  value={evaluatorFilter}
                  onChange={(e) => setEvaluatorFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">All Evaluators</option>
                  {currentEvaluators.map((ev) => (
                    <option key={ev} value={ev}>
                      {ev}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleReset}
                style={{
                  padding: "0.4rem 0.9rem",
                  fontSize: "0.82rem",
                  fontWeight: 500,
                  borderRadius: "6px",
                  border: "1px solid " + inputBorder,
                  background: "transparent",
                  color: textMuted,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = rowHover;
                  e.currentTarget.style.color = textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = textMuted;
                }}
              >
                Reset
              </button>
            </div>
            {/* Column headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.3fr 1fr 0.8fr",
                background: colHeaderBg,
                borderBottom: "1px solid " + border,
              }}
            >
              {[
                { label: "DTN", col: "dtn" },
                { label: "Evaluator", col: "evaluator" },
                { label: "Date", col: "date" },
                { label: "Timeline", col: "timeline" },
              ].map(({ label, col }) => (
                <span
                  key={col}
                  onClick={() => toggleSort(col)}
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: sortCol === col ? accent : textMuted,
                    textAlign: "center",
                    padding: "0.6rem 1rem",
                    cursor: "pointer",
                    userSelect: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "color 0.15s",
                  }}
                >
                  {label}
                  <SortIcon col={col} active={sortCol === col} dir={sortDir} />
                </span>
              ))}
            </div>
            {/* Rows */}
            <div style={{ flex: 1 }}>
              {paginated.length === 0 ? (
                <div
                  style={{
                    padding: "1.5rem 1rem",
                    textAlign: "center",
                    color: textMuted,
                    fontSize: "0.84rem",
                  }}
                >
                  No records found
                </div>
              ) : (
                paginated.map((row, i) => {
                  const tlStyle = timelineColors[row.timeline] || {
                    bg: "#f3f4f6",
                    color: "#374151",
                  };
                  return (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1.3fr 1fr 0.8fr",
                        borderBottom:
                          i < paginated.length - 1
                            ? "1px solid " + border
                            : "none",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = rowHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.84rem",
                          color: darkMode ? textMuted : "#4a5568",
                          fontWeight: 500,
                          fontVariantNumeric: "tabular-nums",
                          textAlign: "center",
                          padding: "0.65rem 1rem",
                        }}
                      >
                        {row.dtn}
                      </span>
                      <span
                        style={{
                          fontSize: "0.84rem",
                          color: textPrimary,
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.4rem",
                          padding: "0.65rem 1rem",
                        }}
                      >
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: getAvatarColor(
                              row.evaluator,
                              uniqueEvaluators,
                            ).color,
                            flexShrink: 0,
                          }}
                        />
                        {row.evaluator}
                      </span>
                      <span
                        style={{
                          fontSize: "0.84rem",
                          color: textPrimary,
                          fontVariantNumeric: "tabular-nums",
                          textAlign: "center",
                          padding: "0.65rem 1rem",
                        }}
                      >
                        {new Date(row.date).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span
                        style={{
                          padding: "0.65rem 1rem",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.73rem",
                            fontWeight: 600,
                            padding: "0.18rem 0.6rem",
                            borderRadius: "99px",
                            background: tlStyle.bg,
                            color: tlStyle.color,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.timeline}
                        </span>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            {/* Pagination */}
            <div
              style={{
                padding: "0.5rem 1rem",
                borderTop: "1px solid " + border,
                background: colHeaderBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "0.75rem", color: textMuted }}>
                {filtered.length} of {tableData.length} records
              </span>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    background: "transparent",
                    border: "1px solid " + border,
                    borderRadius: "5px",
                    color: page === 1 ? textMuted : textPrimary,
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    padding: "0.15rem 0.5rem",
                    fontSize: "0.78rem",
                  }}
                >
                  ‹
                </button>
                <span style={{ fontSize: "0.75rem", color: textMuted }}>
                  {page} / {totalPages || 1}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    background: "transparent",
                    border: "1px solid " + border,
                    borderRadius: "5px",
                    color: page >= totalPages ? textMuted : textPrimary,
                    cursor: page >= totalPages ? "not-allowed" : "pointer",
                    padding: "0.15rem 0.5rem",
                    fontSize: "0.78rem",
                  }}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ ANALYTICS SECTION ══ */}
      <div style={{ marginTop: "2.5rem" }}>
        {/* Section header + chart filters */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.2rem",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "7px",
                  background: darkMode ? "#1a2744" : accent + "18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid " + accent + "33",
                }}
              >
                <span style={{ fontSize: "0.85rem" }}>📊</span>
              </div>
              <h2
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: textPrimary,
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Approval Analytics
              </h2>
            </div>
            <p style={{ fontSize: "0.78rem", color: textMuted, margin: 0 }}>
              Approved, Disapproved and On-process application breakdown with
              trend view
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.6rem",
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            {/* ── NEW: Prescription segmented filter ── */}
            <div>
              <label style={{ ...labelStyle, marginBottom: "0.25rem" }}>
                Prescription
              </label>
              <div
                style={{
                  display: "flex",
                  background: segmentBg,
                  borderRadius: "9px",
                  padding: "3px",
                  gap: "2px",
                }}
              >
                {PRESCRIPTION_TYPES.map((pt) => {
                  const active = rxFilter === pt;
                  const lbl =
                    pt === "All"
                      ? "All"
                      : pt === "Over-the-Counter (OTC)"
                        ? "OTC"
                        : pt === "Vaccine"
                          ? "Vaccine"
                          : "RX";
                  return (
                    <button
                      key={pt}
                      onClick={() => setRxFilter(pt)}
                      style={{
                        padding: "0.28rem 0.7rem",
                        fontSize: "0.76rem",
                        fontWeight: active ? 700 : 500,
                        borderRadius: "6px",
                        border: "none",
                        background: active ? cardBg : "transparent",
                        color: active ? accent : textMuted,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        boxShadow: active
                          ? darkMode
                            ? "0 1px 4px rgba(0,0,0,0.4)"
                            : "0 1px 4px rgba(0,0,0,0.11)"
                          : "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ ...labelStyle, marginBottom: "0.2rem" }}>
                Year
              </label>
              <select
                value={chartYear}
                onChange={(e) => {
                  setChartYear(e.target.value);
                  setChartMonth("All");
                  setChartDay("All");
                }}
                style={{ ...inputStyle, minWidth: "90px" }}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ ...labelStyle, marginBottom: "0.2rem" }}>
                Month
              </label>
              <select
                value={chartMonth}
                onChange={(e) => {
                  setChartMonth(e.target.value);
                  setChartDay("All");
                }}
                disabled={chartYear === "All"}
                style={{
                  ...inputStyle,
                  minWidth: "110px",
                  opacity: chartYear === "All" ? 0.45 : 1,
                  cursor: chartYear === "All" ? "not-allowed" : "pointer",
                }}
              >
                <option value="All">All Months</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {MONTHS[m]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ ...labelStyle, marginBottom: "0.2rem" }}>
                Day
              </label>
              <select
                value={chartDay}
                onChange={(e) => setChartDay(e.target.value)}
                disabled={chartMonth === "All"}
                style={{
                  ...inputStyle,
                  minWidth: "80px",
                  opacity: chartMonth === "All" ? 0.45 : 1,
                  cursor: chartMonth === "All" ? "not-allowed" : "pointer",
                }}
              >
                <option value="All">All Days</option>
                {availableDays.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            {(chartYear !== "All" ||
              chartMonth !== "All" ||
              chartDay !== "All" ||
              rxFilter !== "All") && (
              <button
                onClick={() => {
                  setChartYear("All");
                  setChartMonth("All");
                  setChartDay("All");
                  setRxFilter("All");
                }}
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  borderRadius: "6px",
                  border: "1px solid " + inputBorder,
                  background: "transparent",
                  color: textMuted,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = rowHover;
                  e.currentTarget.style.color = textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = textMuted;
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ── NEW: Active prescription badge ── */}
        {rxFilter !== "All" && (
          <div
            style={{
              marginBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span style={{ fontSize: "0.73rem", color: textMuted }}>
              Filtering by:
            </span>
            <span
              style={{
                fontSize: "0.73rem",
                fontWeight: 600,
                padding: "0.2rem 0.65rem",
                borderRadius: "99px",
                background:
                  (darkMode ? rxColorsDark : rxColors)[rxFilter]?.bg ||
                  "#f3f4f6",
                color:
                  (darkMode ? rxColorsDark : rxColors)[rxFilter]?.color ||
                  "#374151",
              }}
            >
              {rxFilter}
            </span>
          </div>
        )}

        {/* Charts Row */}
        <div
          style={{
            display: "flex",
            gap: "1.25rem",
            flexWrap: "wrap",
            alignItems: "stretch",
          }}
        >
          {/* COL 1: Stat Pills */}
          <div
            style={{
              flex: "0 0 auto",
              width: "clamp(180px, 20%, 220px)",
              display: "grid",
              gridTemplateColumns: "1fr",
              gridAutoRows: "1fr",
              gap: "0.45rem",
            }}
          >
            {statItems.map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: stat.bg,
                  border: "1px solid " + stat.color + "33",
                  borderRadius: "10px",
                  padding: "0.5rem 0.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.05rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: stat.color,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {stat.label}
                </span>
                <span
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    color: stat.color,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.2,
                  }}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* COL 2: Trend Overview */}
          <div
            style={{
              ...cardStyle,
              flex: "2 1 0",
              minWidth: "200px",
              padding: "0.85rem 0.85rem 0.6rem",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ marginBottom: "0.6rem" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: textPrimary,
                }}
              >
                Trend Overview
              </p>
              <p
                style={{
                  margin: "0.1rem 0 0",
                  fontSize: "0.73rem",
                  color: textMuted,
                }}
              >
                Grouped by{" "}
                {chartYear === "All"
                  ? "year"
                  : chartMonth === "All"
                    ? "month"
                    : "day"}
                {chartYear !== "All" && (
                  <span
                    style={{
                      marginLeft: "0.4rem",
                      background: accent + "18",
                      color: accent,
                      borderRadius: "4px",
                      padding: "0.05rem 0.4rem",
                      fontSize: "0.68rem",
                      fontWeight: 600,
                    }}
                  >
                    {chartYear}
                    {chartMonth !== "All" && ` · ${MONTHS[Number(chartMonth)]}`}
                    {chartDay !== "All" && ` · Day ${chartDay}`}
                  </span>
                )}
              </p>
            </div>
            {barData.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: textMuted,
                  fontSize: "0.84rem",
                }}
              >
                No data
              </div>
            ) : (
              // ← PATCHED: onBarClick wired up
              <SVGBarChart
                data={barData}
                darkMode={darkMode}
                textMuted={textMuted}
                textPrimary={textPrimary}
                gridColor={gridColor}
                cardBg={cardBg}
                border={border}
                onBarClick={handleBarClick}
              />
            )}
          </div>

          {/* COL 3: Approval Breakdown */}
          <div
            style={{
              ...cardStyle,
              flex: "1 1 0",
              minWidth: "140px",
              padding: "0.85rem",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ marginBottom: "0.5rem" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: textPrimary,
                }}
              >
                Approval Breakdown
              </p>
              <p
                style={{
                  margin: "0.1rem 0 0",
                  fontSize: "0.73rem",
                  color: textMuted,
                }}
              >
                Click a slice to view records
              </p>
            </div>
            {chartFilteredData.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: textMuted,
                  fontSize: "0.84rem",
                }}
              >
                No data
              </div>
            ) : (
              // ← PATCHED: onSliceClick wired up
              <SVGDonutChart
                data={pieData}
                textMuted={textMuted}
                textPrimary={textPrimary}
                darkMode={darkMode}
                onSliceClick={handleSliceClick}
              />
            )}
          </div>
        </div>
      </div>

      {/* ══ DETAIL MODAL (Evaluator tasks) ══ */}
      {modalEvaluator && (
        <div
          onClick={handleModalClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(3px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: cardBg,
              border: "1px solid " + border,
              borderRadius: "12px",
              overflow: "hidden",
              width: "860px",
              maxWidth: "95vw",
              boxShadow: darkMode
                ? "0 20px 60px rgba(0,0,0,0.3)"
                : "0 20px 60px rgba(67,97,238,0.15), 0 4px 20px rgba(0,0,0,0.08)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "85vh",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.25rem",
                borderBottom: "1px solid " + border,
                background: colHeaderBg,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                {(() => {
                  const av = getAvatarColor(modalEvaluator, uniqueEvaluators);
                  return (
                    <div
                      style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: av.bg,
                        color: av.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        border: "2.5px solid " + av.color + "55",
                        boxShadow: "0 2px 10px " + av.color + "33",
                      }}
                    >
                      {getInitials(modalEvaluator)}
                    </div>
                  );
                })()}
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: textMuted,
                    }}
                  >
                    Tasks for
                  </p>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: textPrimary,
                    }}
                  >
                    {modalEvaluator}
                  </h3>
                </div>
              </div>
              <button
                onClick={handleModalClose}
                style={{
                  background: "transparent",
                  border: "1px solid " + border,
                  borderRadius: "6px",
                  color: textMuted,
                  cursor: "pointer",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ overflowY: "auto", overflowX: "auto", flex: 1 }}>
              <div style={{ minWidth: "640px" }}>
                {/* Modal date filters */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "flex-end",
                    flexWrap: "wrap",
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid " + border,
                    background: colHeaderBg,
                  }}
                >
                  <div style={{ minWidth: "120px" }}>
                    <label
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: textMuted,
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      From
                    </label>
                    <input
                      type="date"
                      value={modalDateFrom}
                      onChange={(e) => setModalDateFrom(e.target.value)}
                      style={{
                        background: inputBg,
                        border: "1px solid " + inputBorder,
                        borderRadius: "6px",
                        padding: "0.35rem 0.6rem",
                        fontSize: "0.8rem",
                        color: textPrimary,
                        outline: "none",
                        colorScheme: darkMode ? "dark" : "light",
                      }}
                    />
                  </div>
                  <div style={{ minWidth: "120px" }}>
                    <label
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: textMuted,
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      To
                    </label>
                    <input
                      type="date"
                      value={modalDateTo}
                      onChange={(e) => setModalDateTo(e.target.value)}
                      style={{
                        background: inputBg,
                        border: "1px solid " + inputBorder,
                        borderRadius: "6px",
                        padding: "0.35rem 0.6rem",
                        fontSize: "0.8rem",
                        color: textPrimary,
                        outline: "none",
                        colorScheme: darkMode ? "dark" : "light",
                      }}
                    />
                  </div>
                  {(modalDateFrom || modalDateTo) && (
                    <button
                      onClick={() => {
                        setModalDateFrom("");
                        setModalDateTo("");
                      }}
                      style={{
                        padding: "0.35rem 0.8rem",
                        fontSize: "0.8rem",
                        fontWeight: 500,
                        borderRadius: "6px",
                        border: "1px solid " + inputBorder,
                        background: "transparent",
                        color: textMuted,
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = rowHover;
                        e.currentTarget.style.color = textPrimary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = textMuted;
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>
                {/* Modal column headers */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr 60px",
                    background: colHeaderBg,
                    borderBottom: "1px solid " + border,
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  {[
                    { label: "Date", col: "date" },
                    { label: "DTN", col: "dtn" },
                    { label: "Application Step", col: "appStep" },
                    { label: "Timeline", col: "timeline" },
                  ].map(({ label, col }) => (
                    <span
                      key={col}
                      onClick={() => toggleModalSort(col)}
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: modalSortCol === col ? accent : textMuted,
                        padding: "0.6rem 1rem",
                        textAlign: "center",
                        cursor: "pointer",
                        userSelect: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "color 0.15s",
                      }}
                    >
                      {label}
                      <SortIcon
                        col={col}
                        active={modalSortCol === col}
                        dir={modalSortDir}
                      />
                    </span>
                  ))}
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: textMuted,
                      padding: "0.6rem 1rem",
                      textAlign: "center",
                      position: "sticky",
                      right: 0,
                      background: darkMode ? headerBg : "#f0f4fc",
                      borderLeft: "1px solid " + border,
                    }}
                  >
                    Action
                  </span>
                </div>
                {/* Modal rows */}
                {modalTasks.length === 0 ? (
                  <div
                    style={{
                      padding: "1.5rem",
                      textAlign: "center",
                      color: textMuted,
                      fontSize: "0.84rem",
                    }}
                  >
                    No tasks found
                  </div>
                ) : (
                  modalTasks.map((task, i) => {
                    const stepStyle = stepColors[task.appStep] || {
                      bg: "#f3f4f6",
                      color: "#374151",
                    };
                    const tlStyle = timelineColors[task.timeline] || {
                      bg: "#f3f4f6",
                      color: "#374151",
                    };
                    return (
                      <div
                        key={i}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr 1fr 60px",
                          borderBottom:
                            i < modalTasks.length - 1
                              ? "1px solid " + border
                              : "none",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = rowHover;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.84rem",
                            color: textPrimary,
                            textAlign: "center",
                            fontVariantNumeric: "tabular-nums",
                            padding: "0.65rem 1rem",
                            alignSelf: "center",
                          }}
                        >
                          {new Date(task.date).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span
                          style={{
                            fontSize: "0.84rem",
                            color: textMuted,
                            textAlign: "center",
                            fontVariantNumeric: "tabular-nums",
                            padding: "0.65rem 1rem",
                            alignSelf: "center",
                          }}
                        >
                          {task.dtn}
                        </span>
                        <span
                          style={{
                            padding: "0.65rem 1rem",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.76rem",
                              fontWeight: 600,
                              padding: "0.2rem 0.65rem",
                              borderRadius: "99px",
                              background: stepStyle.bg,
                              color: stepStyle.color,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {task.appStep}
                          </span>
                        </span>
                        <span
                          style={{
                            padding: "0.65rem 1rem",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.73rem",
                              fontWeight: 600,
                              padding: "0.18rem 0.6rem",
                              borderRadius: "99px",
                              background: tlStyle.bg,
                              color: tlStyle.color,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {task.timeline}
                          </span>
                        </span>
                        <div
                          style={{
                            padding: "0.5rem 0.75rem",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            position: "sticky",
                            right: 0,
                            background: "inherit",
                            borderLeft: "1px solid " + border,
                            zIndex: 1,
                          }}
                        >
                          <ActionMenu
                            task={task}
                            darkMode={darkMode}
                            onReassign={(t) => {
                              handleModalClose();
                              setReassignTask(t);
                            }}
                            border={border}
                            textPrimary={textPrimary}
                            textMuted={textMuted}
                            cardBg={cardBg}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div
              style={{
                padding: "0.6rem 1.25rem",
                borderTop: "1px solid " + border,
                background: colHeaderBg,
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "0.75rem", color: textMuted }}>
                {modalTasks.length !== allModalTasks.length
                  ? `${modalTasks.length} of ${allModalTasks.length} task${allModalTasks.length !== 1 ? "s" : ""}`
                  : `${allModalTasks.length} task${allModalTasks.length !== 1 ? "s" : ""} assigned`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ══ NEW: CHART DETAIL MODAL ══ */}
      {chartModal && (
        <ChartDetailModal
          title={chartModal.title}
          subtitle={chartModal.subtitle}
          rows={chartModal.rows}
          darkMode={darkMode}
          onClose={() => setChartModal(null)}
          border={border}
          textPrimary={textPrimary}
          textMuted={textMuted}
          cardBg={cardBg}
          colHeaderBg={colHeaderBg}
          rowHover={rowHover}
          accent={accent}
          inputBg={inputBg}
          inputBorder={inputBorder}
        />
      )}

      {/* ══ REASSIGN MODAL ══ */}
      {reassignTask && (
        <ReassignModal
          task={reassignTask}
          evaluators={uniqueEvaluators}
          darkMode={darkMode}
          onClose={() => setReassignTask(null)}
          onConfirm={handleReassignConfirm}
          border={border}
          textPrimary={textPrimary}
          textMuted={textMuted}
          cardBg={cardBg}
          headerBg={colHeaderBg}
          inputBg={inputBg}
          inputBorder={inputBorder}
        />
      )}
    </div>
  );
}

export default MonitoringPage;
