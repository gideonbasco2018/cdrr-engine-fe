// src/components/monitoring/evaluatorAppTypes/Pager.jsx
export default function Pager({ page, total, pageSize, onChange, ui }) {
  if (total <= pageSize) return null;
  const pages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const btn = (disabled) => ({
    padding: "4px 12px",
    fontSize: "0.72rem",
    borderRadius: 7,
    border: `1px solid ${ui.cardBorder}`,
    background: "transparent",
    color: ui.textPrimary,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.35 : 1,
  });
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 4px 2px",
      }}
    >
      <span style={{ fontSize: "0.7rem", color: ui.textMuted }}>
        {start}–{end} of {total.toLocaleString()}
      </span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button
          style={btn(page === 1)}
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          ‹ Prev
        </button>
        <span style={{ fontSize: "0.7rem", color: ui.textMuted }}>
          Page {page} / {pages}
        </span>
        <button
          style={btn(page >= pages)}
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next ›
        </button>
      </div>
    </div>
  );
}
