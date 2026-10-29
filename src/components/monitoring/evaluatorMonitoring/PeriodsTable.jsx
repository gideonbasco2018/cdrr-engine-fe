// src/components/monitoring/evaluatorMonitoring/PeriodsTable.jsx
// The rows of "Received and Released": one row per year (or per month), each
// with a number and a stacked bar for Received and for Released, then a Total
// row. Used by the page (by year, roomy rows) and by the month-by-month dialog
// (compact rows, sticky header and Total).
import { useEffect, useRef, useState } from "react";
import { Icon } from "./ui";

const fmt = (n) => Number(n ?? 0).toLocaleString();

// Each bar is 100% of its own number and shows what it is made of:
//   Received: released in 2025 / 2026 ... (or Mar 2026 ...) + not released yet
//   Released: received in 2023 / 2024 ... (or Jan 2024 ...) + no received date
// The hatched part is the "rest" (no release date / no received date).
const SHADES = [1, 0.78, 0.58, 0.42, 0.3];

// rows = [{ key, year, month?, label?, count }] from the API
export function buildSegments({ rows, verb, color, rest, total }) {
  const segs = rows.map((r, i) => ({
    key: r.key ?? r.year,
    year: r.year,
    month: r.month, // only when the splits are cut by month
    count: r.count,
    color,
    alpha: SHADES[Math.min(i, SHADES.length - 1)],
    text: `${fmt(r.count)} ${verb} ${r.label ?? r.year}`,
  }));
  if (rest.count > 0)
    segs.push({
      key: "rest",
      count: rest.count,
      hatched: true,
      text: `${fmt(rest.count)} ${rest.text}`,
    });
  return segs.map((s) => ({
    ...s,
    pct: total ? Math.round((s.count / total) * 100) : 0,
  }));
}

const hatch = (t) =>
  `repeating-linear-gradient(135deg, ${t.lineStrong} 0 3px, transparent 3px 6px)`;

// A number that counts up to its value (and from the old value when it
// changes). Shows the value at once when the user prefers reduced motion.
export function CountUp({ value, duration = 700 }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || value === from.current) {
      from.current = value;
      setShown(value);
      return undefined;
    }
    const startAt = performance.now();
    const startValue = from.current;
    let raf;
    const step = (now) => {
      const p = Math.min(1, (now - startAt) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(startValue + (value - startValue) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{fmt(shown)}</>;
}

// sizes of a roomy row and of a compact (thin) row
const SIZE = {
  roomy: { tile: 72, gap: 14, bar: 10, font: "1.2rem", minW: 54, pad: "3px 11px", radius: 10, caption: 79 },
  compact: { tile: 56, gap: 12, bar: 8, font: "0.98rem", minW: 40, pad: "1px 8px", radius: 8, caption: 61 },
};

// the number and its stacked bar. Clicking the number opens the whole list;
// clicking one part of the bar opens only that part (onOpen gets the segment).
// The bar is wiped in from the left; `delay` staggers the rows.
export function SplitBar({
  value,
  segments,
  t,
  onOpen,
  delay = 0,
  tone = "blue",
  compact = false,
}) {
  const z = compact ? SIZE.compact : SIZE.roomy;
  // the number takes the colour of its column: light blue = Received, green = Released
  const c =
    tone === "green"
      ? { ink: t.accentText, soft: t.accentSoft, line: t.accentLine }
      : { ink: t.blueText, soft: t.blueSoft, line: t.blueLine };
  const number = {
    display: "inline-block",
    minWidth: z.minW,
    padding: z.pad,
    textAlign: "center",
    borderRadius: z.radius,
    fontFamily: "inherit",
    fontSize: z.font,
    lineHeight: 1.25,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: z.gap }}>
      <span style={{ width: z.tile, flexShrink: 0 }}>
        {value > 0 && onOpen ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(null);
            }}
            title="Show these applications"
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = `0 0 0 3px ${c.soft}`;
              e.currentTarget.style.borderColor = c.ink;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = c.line;
            }}
            style={{
              ...number,
              background: c.soft,
              color: c.ink,
              border: `1px solid ${c.line}`,
              cursor: "pointer",
              transition: "box-shadow .15s, border-color .15s, transform .12s",
            }}
          >
            <CountUp value={value} />
          </button>
        ) : (
          <span
            style={{
              ...number,
              fontWeight: 500,
              color: t.ink3,
              border: "1px solid transparent",
            }}
          >
            <CountUp value={value} />
          </span>
        )}
      </span>
      <span
        style={{
          flex: 1,
          height: z.bar,
          borderRadius: 999,
          background: t.pill,
          overflow: "hidden",
          display: "block",
        }}
      >
        <span
          className="em-wipe"
          style={{
            display: "flex",
            gap: 2,
            width: "100%",
            height: "100%",
            animationDelay: `${delay}ms`,
          }}
        >
          {segments.map((s) => (
            <span
              key={s.key}
              title={`${s.text} (${s.pct}%) — click to show these applications`}
              onClick={
                onOpen
                  ? (e) => {
                      e.stopPropagation();
                      onOpen(s);
                    }
                  : undefined
              }
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
              style={{
                flex: `${s.count} 1 0`,
                height: "100%",
                background: s.hatched ? hatch(t) : s.color,
                opacity: s.hatched ? 1 : s.alpha,
                cursor: onOpen ? "pointer" : "default",
                transition: "filter .15s",
              }}
            />
          ))}
        </span>
      </span>
    </div>
  );
}

// the legend under the bar; each dot has the colour of its segment, and each
// item opens the list of that part. In a compact row only the biggest parts are
// written out, so the row stays thin ("+3 more" lists the rest on hover).
export function SplitCaption({ segments, t, onOpen, compact = false, maxItems = 4 }) {
  if (segments.length === 0) return null;
  const z = compact ? SIZE.compact : SIZE.roomy;

  let shown = segments;
  let hidden = [];
  if (compact && segments.length > maxItems) {
    const keep = new Set(
      [...segments]
        .sort((a, b) => b.count - a.count)
        .slice(0, maxItems)
        .map((s) => s.key),
    );
    shown = segments.filter((s) => keep.has(s.key));
    hidden = segments.filter((s) => !keep.has(s.key));
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: compact ? "0 4px" : "2px 6px",
        marginTop: compact ? 3 : 5,
        paddingLeft: z.caption,
        fontSize: compact ? "0.64rem" : "0.68rem",
        color: t.ink2,
      }}
    >
      {shown.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={
            onOpen
              ? (e) => {
                  e.stopPropagation();
                  onOpen(s);
                }
              : undefined
          }
          title="Show these applications"
          onMouseEnter={(e) => (e.currentTarget.style.background = t.blueSoft)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: compact ? 5 : 6,
            padding: compact ? "1px 6px" : "2px 7px",
            background: "transparent",
            border: "none",
            borderRadius: 6,
            fontFamily: "inherit",
            fontSize: "inherit",
            color: "inherit",
            cursor: onOpen ? "pointer" : "default",
          }}
        >
          <span
            style={{
              width: compact ? 7 : 8,
              height: compact ? 7 : 8,
              borderRadius: 3,
              flexShrink: 0,
              background: s.hatched ? hatch(t) : s.color,
              opacity: s.hatched ? 1 : s.alpha,
              border: s.hatched ? `1px solid ${t.lineStrong}` : "none",
              boxSizing: "border-box",
            }}
          />
          {s.text}
          <span style={{ color: t.ink3 }}>{s.pct}%</span>
        </button>
      ))}
      {hidden.length > 0 && (
        <span
          title={hidden.map((s) => `${s.text} (${s.pct}%)`).join("\n")}
          style={{ padding: "1px 6px", color: t.ink3, cursor: "help" }}
        >
          +{hidden.length} more
        </span>
      )}
    </div>
  );
}

// periods    = data.periods from the API
// mode       = "year" | "month" (only changes the first column title)
// onOpen     = (side, period, segment|null) opens the list of applications
// onRowClick = when given, the whole row is clickable
// compact    = thin rows (the month-by-month dialog)
// scroll     = true: this component scrolls (its sticky header / Total stick
//              inside it); false: the parent scrolls
export function PeriodsTable({
  periods,
  mode,
  selectedKey = null,
  onOpen,
  onRowClick,
  rowTitle,
  compact = false,
  scroll = true,
  ui,
  t,
  maxHeight = 700,
}) {
  const receivedSegs = (p) =>
    buildSegments({
      rows: p.received_split?.released || [],
      verb: "released in",
      color: t.blue, // the Received column is light blue all the way
      rest: {
        count: p.received_split?.not_released || 0,
        text: "not released yet",
      },
      total: p.received,
    });
  const releasedSegs = (p) =>
    buildSegments({
      rows: p.released_split?.received || [],
      verb: "received in",
      color: t.accent, // the Released column is green all the way
      rest: {
        count: p.released_split?.no_received_date || 0,
        text: "with no received date",
      },
      total: p.released,
    });
  const totalReceived = periods.reduce((n, p) => n + p.received, 0);
  const totalReleased = periods.reduce((n, p) => n + p.released, 0);
  const totalSplitReleased = periods.reduce(
    (n, p) =>
      n + (p.received_split?.released || []).reduce((m, r) => m + r.count, 0),
    0,
  );
  const totalNotReleased = periods.reduce(
    (n, p) => n + (p.received_split?.not_released || 0),
    0,
  );

  const grid = {
    display: "grid",
    gridTemplateColumns: `${compact ? 72 : 88}px minmax(0, 1fr) minmax(0, 1fr)`,
    columnGap: compact ? 32 : 44,
    alignItems: "center",
    padding: "0 1.1rem",
  };
  const headLabel = {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    fontSize: "0.6rem",
    fontWeight: 600,
    letterSpacing: "0.09em",
    textTransform: "uppercase",
    color: t.ink3,
  };
  const dot = (color) => (
    <span
      style={{ width: 8, height: 8, borderRadius: "50%", background: color }}
    />
  );
  const totalNumber = (color) => ({
    display: "inline-block",
    minWidth: compact ? 40 : 54,
    padding: compact ? "1px 8px" : "3px 11px",
    border: "1px solid transparent",
    textAlign: "center",
    fontSize: compact ? "0.98rem" : "1.2rem",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color,
  });

  return (
    <div style={scroll ? { maxHeight, overflow: "auto" } : undefined}>
      {/* header: stays at the top while the rows scroll */}
      <div
        style={{
          ...grid,
          height: compact ? 34 : 38,
          borderBottom: `1px solid ${t.line}`,
          position: "sticky",
          top: 0,
          zIndex: 3,
          background: t.surface,
        }}
      >
        <span style={headLabel}>{mode === "year" ? "Year" : "Month"}</span>
        <span style={headLabel}>
          {dot(t.blue)}
          Received
        </span>
        <span style={headLabel}>
          {dot(t.accent)}
          Released
        </span>
      </div>

      {periods.map((p, idx) => {
        const selected = selectedKey != null && selectedKey === p.key;
        const clickable = !!onRowClick;
        return (
          <div
            key={p.key}
            {...(clickable
              ? {
                  role: "button",
                  tabIndex: 0,
                  title: rowTitle ? rowTitle(p) : `Show the monthly breakdown of ${p.label}`,
                  onClick: () => onRowClick(p),
                  onKeyDown: (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowClick(p);
                    }
                  },
                }
              : {})}
            style={{
              ...grid,
              alignItems: "start",
              padding: compact ? "9px 1.1rem" : "15px 1.1rem",
              borderBottom: `1px solid ${t.line}`,
              background: selected ? t.blueSoft : "transparent",
              cursor: clickable ? "pointer" : "default",
              transition: "background .12s",
            }}
            onMouseEnter={(e) =>
              !selected && (e.currentTarget.style.background = t.rowHover)
            }
            onMouseLeave={(e) => !selected && ui.hoverOff(e)}
          >
            <span
              style={{
                paddingTop: compact ? 2 : 5, // lines up with the numbers
                display: "inline-flex",
                alignItems: "flex-start",
                gap: 6,
                fontSize: compact ? "0.84rem" : "0.9rem",
                fontWeight: 600,
                letterSpacing: "-0.01em",
              }}
            >
              {p.label}
              {clickable && (
                <Icon
                  name="chevron"
                  size={13}
                  style={{
                    marginTop: compact ? 3 : 4,
                    color: t.ink3,
                    transform: "rotate(-90deg)",
                  }}
                />
              )}
            </span>
            <div>
              <SplitBar
                value={p.received}
                segments={receivedSegs(p)}
                t={t}
                compact={compact}
                delay={250 + idx * (compact ? 50 : 90)}
                tone="blue"
                onOpen={(seg) => onOpen("received", p, seg)}
              />
              <SplitCaption
                segments={receivedSegs(p)}
                t={t}
                compact={compact}
                onOpen={(seg) => onOpen("received", p, seg)}
              />
            </div>
            <div>
              <SplitBar
                value={p.released}
                segments={releasedSegs(p)}
                t={t}
                compact={compact}
                delay={330 + idx * (compact ? 50 : 90)}
                tone="green"
                onOpen={(seg) => onOpen("released", p, seg)}
              />
              <SplitCaption
                segments={releasedSegs(p)}
                t={t}
                compact={compact}
                onOpen={(seg) => onOpen("released", p, seg)}
              />
            </div>
          </div>
        );
      })}

      {/* Total: the footer, it stays at the bottom while the rows scroll */}
      <div
        style={{
          ...grid,
          height: compact ? 44 : 46,
          background: t.sunken,
          borderTop: `1px solid ${t.line}`,
          boxShadow: `0 -8px 12px -10px ${t.lineStrong}`,
          fontVariantNumeric: "tabular-nums",
          position: "sticky",
          bottom: 0,
          zIndex: 3,
        }}
      >
        <span style={{ ...headLabel, color: t.ink2 }}>Total</span>
        <div>
          <span style={totalNumber(t.blueText)}>
            <CountUp value={totalReceived} />
          </span>
          <span style={{ marginLeft: 12, fontSize: "0.68rem", color: t.ink2 }}>
            {fmt(totalSplitReleased)} released · {fmt(totalNotReleased)} not
            released yet
          </span>
        </div>
        <div>
          <span style={totalNumber(t.accentText)}>
            <CountUp value={totalReleased} />
          </span>
        </div>
      </div>
    </div>
  );
}
