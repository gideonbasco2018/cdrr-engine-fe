import { FB } from "./constants";

// Shared page-number footer used by Recent Applications and Upload History.
function pageList(page, totalPages) {
  const keep = new Set([1, totalPages, page - 1, page, page + 1]);
  const nums = [...keep]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("gap" + n);
    out.push(n);
  });
  return out;
}

export default function Pagination({ page, totalPages, total, onChange, ui }) {
  if (!totalPages || totalPages <= 1) return null;
  const navBtn = (label, disabled, target) => (
    <button
      onClick={() => onChange(target)}
      disabled={disabled}
      style={{
        padding: "4px 10px",
        borderRadius: 6,
        border: `1px solid ${disabled ? ui.cardBorder : ui.metricBorder}`,
        background: "transparent",
        color: disabled ? ui.textMuted : ui.textPrimary,
        fontSize: "0.76rem",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        padding: "10px 16px",
        borderTop: `1px solid ${ui.divider}`,
        gap: 8,
        marginTop: "auto",
      }}
    >
      <span style={{ fontSize: "0.74rem", color: ui.textMuted }}>
        Page {page} of {totalPages}
        {total > 0 && (
          <span style={{ marginLeft: 6 }}>
            · {total.toLocaleString()} total
          </span>
        )}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {navBtn("‹ Prev", page <= 1, page - 1)}
        {pageList(page, totalPages).map((n) =>
          typeof n === "string" ? (
            <span
              key={n}
              style={{
                fontSize: "0.74rem",
                color: ui.textMuted,
                padding: "0 2px",
              }}
            >
              …
            </span>
          ) : (
            <button
              key={n}
              onClick={() => onChange(n)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: `1px solid ${n === page ? FB : ui.cardBorder}`,
                background: n === page ? FB : "transparent",
                color: n === page ? "#fff" : ui.textPrimary,
                fontSize: "0.76rem",
                fontWeight: n === page ? 700 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {n}
            </button>
          ),
        )}
        {navBtn("Next ›", page >= totalPages, page + 1)}
      </div>
    </div>
  );
}
