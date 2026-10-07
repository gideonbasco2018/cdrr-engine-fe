// FILE: src/components/checklist/ChecklistDateFilterModal.jsx
import { useEffect, useMemo, useState } from "react";
import ModalShell from "../donation/ModalShell";

/* ── Date filter for the checklist list — pick one day, or a start and an
   end day (e.g. Sep 1 → Sep 5). Dates are plain "YYYY-MM-DD" strings in
   Manila time, the same zone created_at is stored in. ── */

const MANILA = "Asia/Manila";
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const ACCENT = "#2563eb";

const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`; // m is 0-based
const todayManila = () => new Date().toLocaleDateString("en-CA", { timeZone: MANILA }); // YYYY-MM-DD
const parse = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m: m - 1, d };
};
const shiftDays = (s, days) => {
  const { y, m, d } = parse(s);
  const t = new Date(Date.UTC(y, m, d + days));
  return ymd(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
};
export const fmtFilterDate = (s) => {
  const { y, m, d } = parse(s);
  return new Date(Date.UTC(y, m, d)).toLocaleDateString("en-US", {
    month: "short", day: "2-digit", year: "numeric", timeZone: "UTC",
  });
};
export const fmtFilterRange = (f) =>
  !f ? "" : f.from === f.to ? fmtFilterDate(f.from) : `${fmtFilterDate(f.from)} – ${fmtFilterDate(f.to)}`;

const presets = () => {
  const today = todayManila();
  const { y, m } = parse(today);
  const lastMonthEnd = shiftDays(ymd(y, m, 1), -1);
  const lm = parse(lastMonthEnd);
  return [
    { label: "Today", from: today, to: today },
    { label: "Yesterday", from: shiftDays(today, -1), to: shiftDays(today, -1) },
    { label: "Last 7 days", from: shiftDays(today, -6), to: today },
    { label: "This month", from: ymd(y, m, 1), to: today },
    { label: "Last month", from: ymd(lm.y, lm.m, 1), to: lastMonthEnd },
  ];
};

export default function ChecklistDateFilterModal({ value, onApply, onClose, colors, darkMode }) {
  const today = todayManila();
  const [start, setStart] = useState(value?.from || null);
  const [end, setEnd] = useState(value?.to && value.to !== value.from ? value.to : null);
  const [hover, setHover] = useState(null);
  const [view, setView] = useState(() => {
    const { y, m } = parse(value?.from || today);
    return { y, m };
  });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 6 rows × 7 days, blanks before the 1st.
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
    const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
    return Array.from({ length: 42 }, (_, i) => {
      const d = i - first + 1;
      return d >= 1 && d <= days ? ymd(view.y, view.m, d) : null;
    });
  }, [view]);

  const pick = (d) => {
    if (!start || end) {
      setStart(d);
      setEnd(null);
    } else if (d < start) {
      setStart(d);
    } else if (d === start) {
      setEnd(null); // same day twice = single day
    } else {
      setEnd(d);
    }
  };

  // Range to shade: the picked one, or start → hovered day while choosing.
  const rangeEnd = end || (start && hover && hover > start ? hover : null);
  const inRange = (d) => start && rangeEnd && d > start && d < rangeEnd;
  const isEdge = (d) => d === start || d === rangeEnd;

  const shiftMonth = (delta) =>
    setView((v) => {
      const t = new Date(Date.UTC(v.y, v.m + delta, 1));
      return { y: t.getUTCFullYear(), m: t.getUTCMonth() };
    });

  const monthTitle = new Date(Date.UTC(view.y, view.m, 1)).toLocaleDateString("en-US", {
    month: "long", year: "numeric", timeZone: "UTC",
  });
  const bandBg = darkMode ? "rgba(37,99,235,0.22)" : "rgba(37,99,235,0.12)";
  const summary = start ? fmtFilterRange({ from: start, to: end || start }) : "Pick a day, or a start and an end day";

  const navBtn = {
    width: 30, height: 30, borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
    background: "transparent", color: colors.textSecondary, cursor: "pointer", fontSize: "0.9rem",
  };

  return (
    <ModalShell
      onClose={onClose}
      icon="📅"
      title="Filter by date"
      subtitle="Show checklists created on a day or within a range"
      width={560}
      colors={colors}
      footer={
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ flex: 1, fontSize: "0.8rem", fontWeight: 600, color: start ? colors.textPrimary : colors.textTertiary }}>
            {summary}
          </div>
          {value && (
            <button
              onClick={() => onApply(null)}
              style={{
                padding: "0.4rem 0.9rem", borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
                background: "transparent", color: colors.textSecondary, fontSize: "0.78rem", cursor: "pointer",
              }}
            >
              Clear filter
            </button>
          )}
          <button
            onClick={() => start && onApply({ from: start, to: end || start })}
            disabled={!start}
            style={{
              padding: "0.4rem 1.1rem", borderRadius: 8, border: "none",
              background: start ? `linear-gradient(135deg, ${ACCENT}, #7c3aed)` : "#9ca3af",
              color: "#fff", fontSize: "0.78rem", fontWeight: 700, cursor: start ? "pointer" : "not-allowed",
              boxShadow: start ? "0 4px 14px rgba(37,99,235,0.35)" : "none",
            }}
          >
            Apply
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", gap: "1rem", padding: "0.25rem 0" }}>
        {/* Quick picks */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: 120 }}>
          {presets().map((p) => {
            const on = start === p.from && (end || start) === p.to;
            return (
              <button
                key={p.label}
                onClick={() => {
                  setStart(p.from);
                  setEnd(p.to === p.from ? null : p.to);
                  const { y, m } = parse(p.from);
                  setView({ y, m });
                }}
                style={{
                  textAlign: "left", padding: "0.45rem 0.7rem", borderRadius: 8, fontSize: "0.78rem",
                  fontWeight: on ? 700 : 500, cursor: "pointer",
                  border: `1px solid ${on ? ACCENT : colors.cardBorder}`,
                  background: on ? bandBg : "transparent",
                  color: on ? ACCENT : colors.textSecondary,
                  transition: "all 0.15s ease",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Calendar */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <button onClick={() => shiftMonth(-1)} style={navBtn} aria-label="Previous month">‹</button>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: colors.textPrimary }}>{monthTitle}</div>
            <button onClick={() => shiftMonth(1)} style={navBtn} aria-label="Next month">›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 4 }}>
            {WEEKDAYS.map((w) => (
              <div key={w} style={{ textAlign: "center", fontSize: "0.68rem", fontWeight: 700, color: colors.textTertiary, paddingBottom: 4 }}>
                {w}
              </div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={`blank-${i}`} />;
              const edge = isEdge(d);
              const band = inRange(d) || (edge && start && rangeEnd && start !== rangeEnd);
              return (
                <div
                  key={d}
                  style={{
                    // the band joins the start and end circles into one strip
                    background: band ? bandBg : "transparent",
                    borderTopLeftRadius: d === start ? 999 : 0,
                    borderBottomLeftRadius: d === start ? 999 : 0,
                    borderTopRightRadius: d === rangeEnd ? 999 : 0,
                    borderBottomRightRadius: d === rangeEnd ? 999 : 0,
                  }}
                >
                  <button
                    onClick={() => pick(d)}
                    onMouseEnter={() => setHover(d)}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      width: "100%", aspectRatio: "1", maxHeight: 38, borderRadius: 999, cursor: "pointer",
                      fontSize: "0.8rem", fontWeight: edge || d === today ? 700 : 500,
                      border: d === today && !edge ? `1.5px solid ${ACCENT}` : "1.5px solid transparent",
                      background: edge ? `linear-gradient(135deg, ${ACCENT}, #7c3aed)` : "transparent",
                      color: edge ? "#fff" : d > today ? colors.textTertiary : colors.textPrimary,
                      boxShadow: edge ? "0 3px 10px rgba(37,99,235,0.35)" : "none",
                      transition: "background 0.15s ease, transform 0.1s ease",
                    }}
                    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
                    onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    {Number(d.slice(8))}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
