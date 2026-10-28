// src/components/gmp/dashboard/GMPCountryBreakdown.jsx
// "By manufacturer country" — every country, not just the top few.
//   left  : the #1 country as a headline, plus how concentrated the volume is
//   right : the full ranked list (search, PIC/S filter, scrolls)
// Bars are green for a current PIC/S member and amber for any other country,
// the same colors as the PIC/S vs Non-PIC/S card. "Other / Not Detected" is
// the records whose address didn't end in a country the parser could read.
import { useMemo, useState } from "react";
import { EmptyChart, SkeletonBox } from "./gmpAnalyticsShared";

const PICS = "#0f8a72";
const NON = "#b9740f";
const OTHER = "Other / Not Detected";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pics", label: "PIC/S" },
  { id: "non", label: "Non-PIC/S" },
];

const colorOf = (c) => (c.pics ? PICS : NON);
const pct = (n, total) => (total > 0 ? (n / total) * 100 : 0);
const pctText = (n, total) => { const p = pct(n, total); return p > 0 && p < 1 ? "<1%" : `${Math.round(p)}%`; };

export default function GMPCountryBreakdown({ items, ui, loading }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [hov, setHov] = useState(null);

  const { countries, other, total } = useMemo(() => {
    const all = items ?? [];
    const countries = all.filter((c) => c.name !== OTHER);
    const other = all.find((c) => c.name === OTHER) ?? null;
    return { countries, other, total: all.reduce((a, c) => a + c.count, 0) };
  }, [items]);

  if (loading) return <SkeletonBox height={300} ui={ui} />;
  if (!countries.length && !other) return <EmptyChart label="No manufacturer address data" ui={ui} />;

  const top = countries[0];
  const top3 = countries.slice(0, 3);
  const top3Count = top3.reduce((a, c) => a + c.count, 0);
  const picsCount = countries.filter((c) => c.pics).reduce((a, c) => a + c.count, 0);
  const max = Math.max(...countries.map((c) => c.count), other?.count ?? 0, 1);

  const q = query.trim().toLowerCase();
  const visible = countries.filter((c) => (
    (filter === "all" || (filter === "pics" ? c.pics : !c.pics)) && (!q || c.name.toLowerCase().includes(q))
  ));
  const showOther = other && filter === "all" && (!q || OTHER.toLowerCase().includes(q) || "not detected".includes(q));

  const chip = (text, color) => (
    <span style={{ padding: "1px 7px", borderRadius: 99, fontSize: "0.62rem", fontWeight: 700, background: `${color}18`, color, whiteSpace: "nowrap" }}>{text}</span>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, alignItems: "start" }}>
      {/* ── Left: headline + concentration ── */}
      <div>
        {top && (
          <div className="gmp-rise" style={{ padding: "16px 18px", borderRadius: 14, background: `${colorOf(top)}10`, border: `1px solid ${colorOf(top)}33` }}>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: ui.textMuted }}>Top country</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", margin: "6px 0 2px" }}>
              <span style={{ fontSize: "1.5rem", fontWeight: 800, color: colorOf(top), lineHeight: 1.1 }}>{top.name}</span>
              {chip(top.pics ? "PIC/S" : "Non-PIC/S", colorOf(top))}
            </div>
            <div style={{ fontSize: "0.8rem", color: ui.textSub }}>
              <b style={{ color: ui.textPrimary }}>{top.count.toLocaleString()}</b> records · {pct(top.count, total).toFixed(1)}% of all
            </div>
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: ui.textMuted, marginBottom: 7 }}>
            <span>Top 3 countries</span>
            <b style={{ color: ui.textPrimary }}>{pct(top3Count, total).toFixed(0)}% of records</b>
          </div>
          <div style={{ display: "flex", gap: 3, height: 10 }}>
            {top3.map((c, i) => (
              <div
                key={c.name} title={`${c.name}: ${c.count.toLocaleString()} (${pct(c.count, total).toFixed(1)}%)`} className="gmp-grow"
                onMouseEnter={() => setHov(c.name)} onMouseLeave={() => setHov(null)}
                style={{ flex: c.count, background: colorOf(c), opacity: hov && hov !== c.name ? 0.35 : 1 - i * 0.18, borderRadius: 5, transition: "opacity 0.15s" }}
              />
            ))}
            {total - top3Count > 0 && <div style={{ flex: total - top3Count, background: ui.progressBg, borderRadius: 5 }} title={`Other countries: ${(total - top3Count).toLocaleString()}`} />}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18 }}>
          {[
            { label: "Countries", value: countries.length.toLocaleString(), color: ui.textPrimary },
            { label: "From PIC/S members", value: `${pct(picsCount, total).toFixed(0)}%`, color: PICS },
          ].map((s) => (
            <div key={s.label} style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${ui.cardBorder}` }}>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: ui.textMuted }}>{s.label}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: s.color, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: the full list ── */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <input
            value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${countries.length} countries…`} aria-label="Search countries"
            style={{ flex: "1 1 150px", minWidth: 0, height: 32, padding: "0 12px", borderRadius: 8, border: `1px solid ${ui.cardBorder}`, background: "transparent", color: ui.textPrimary, fontSize: "0.78rem", outline: "none" }}
          />
          <div style={{ display: "inline-flex", gap: 2 }}>
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id} type="button" onClick={() => setFilter(f.id)}
                  style={{ border: "none", cursor: "pointer", padding: "5px 10px", borderRadius: 6, fontSize: "0.74rem", fontWeight: active ? 700 : 500, color: active ? PICS : ui.textMuted, background: active ? `${PICS}14` : "transparent" }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
          {visible.map((c) => {
            const rank = countries.indexOf(c) + 1;
            return (
              <Row
                key={c.name} rank={rank} name={c.name} count={c.count} color={colorOf(c)} share={pctText(c.count, total)}
                width={(c.count / max) * 100} tag={c.pics ? "PIC/S" : null} ui={ui}
                dim={hov != null && hov !== c.name} onHover={setHov} title={`${c.name}: ${c.count.toLocaleString()} (${pct(c.count, total).toFixed(1)}%)`}
              />
            );
          })}
          {showOther && (
            <Row
              rank="–" name="Not detected" count={other.count} color={ui.textMuted} share={pctText(other.count, total)}
              width={(other.count / max) * 100} ui={ui} muted dim={hov != null && hov !== OTHER} onHover={(n) => setHov(n === "Not detected" ? OTHER : n)}
              title="The manufacturer address doesn't end in a country the system can read — fix it on the record"
            />
          )}
          {!visible.length && !showOther && (
            <div style={{ padding: "24px 0", textAlign: "center", fontSize: "0.78rem", color: ui.textMuted }}>No country matches</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ rank, name, count, color, share, width, tag, ui, muted, dim, onHover, title }) {
  return (
    <div
      title={title} onMouseEnter={() => onHover(name)} onMouseLeave={() => onHover(null)}
      style={{ display: "grid", gridTemplateColumns: "22px minmax(90px, 1.1fr) minmax(70px, 1.6fr) 40px 34px", alignItems: "center", gap: 10, padding: "6px 6px", borderRadius: 8, opacity: dim ? 0.4 : 1, transition: "opacity 0.15s, background 0.15s", cursor: "default" }}
      onMouseOver={(e) => { e.currentTarget.style.background = ui.hoverBg; }} onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ fontSize: "0.66rem", color: ui.textMuted, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{rank}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <span style={{ fontSize: "0.8rem", color: muted ? ui.textMuted : ui.textPrimary, fontStyle: muted ? "italic" : "normal", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
        {tag && <span style={{ width: 6, height: 6, borderRadius: "50%", background: PICS, flexShrink: 0 }} title="PIC/S member" />}
      </span>
      <div style={{ height: 6, borderRadius: 99, background: ui.progressBg, overflow: "hidden" }}>
        <div className="gmp-grow" style={{ width: `${Math.max(width, 1.5)}%`, height: "100%", borderRadius: 99, background: color, opacity: muted ? 0.5 : 1 }} />
      </div>
      <span style={{ textAlign: "right", fontSize: "0.8rem", fontWeight: 700, color: ui.textPrimary, fontVariantNumeric: "tabular-nums" }}>{count.toLocaleString()}</span>
      <span style={{ textAlign: "right", fontSize: "0.68rem", color: ui.textMuted, fontVariantNumeric: "tabular-nums" }}>{share}</span>
    </div>
  );
}
