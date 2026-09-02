// FILE: src/components/reports/ExportColumnsModal.jsx
import { useState, useEffect, useMemo } from "react";
import { getExportColumns } from "../../api/reports";

function ExportColumnsModal({ onClose, onConfirm, colors, darkMode }) {
  const [columns, setColumns] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const cols = await getExportColumns();
        setColumns(cols);
        setSelected(new Set(cols.map((c) => c.id))); // all checked by default
      } catch (err) {
        console.error("Failed to fetch export columns:", err);
        setError("Failed to load column list.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    const g = {};
    columns.forEach((c) => {
      g[c.group] = g[c.group] || [];
      g[c.group].push(c);
    });
    return g;
  }, [columns]);

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleGroup = (groupCols, checkAll) => {
    const next = new Set(selected);
    groupCols.forEach((c) => (checkAll ? next.add(c.id) : next.delete(c.id)));
    setSelected(next);
  };
  const selectAll = () => setSelected(new Set(columns.map((c) => c.id)));
  const selectNone = () => setSelected(new Set());

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 14,
          padding: "1.5rem",
          width: 520,
          maxWidth: "90vw",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3
            style={{ margin: 0, fontSize: "1rem", color: colors.textPrimary }}
          >
            Select columns to include
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1rem",
              color: colors.textTertiary,
            }}
          >
            ✕
          </button>
        </div>

        <p
          style={{
            fontSize: "0.75rem",
            color: colors.textSecondary,
            margin: 0,
          }}
        >
          Fewer columns means a faster export. {selected.size} /{" "}
          {columns.length} selected.
        </p>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={selectAll}
            style={{
              fontSize: "0.7rem",
              padding: "3px 10px",
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textPrimary,
              cursor: "pointer",
            }}
          >
            Select All
          </button>
          <button
            onClick={selectNone}
            style={{
              fontSize: "0.7rem",
              padding: "3px 10px",
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textPrimary,
              cursor: "pointer",
            }}
          >
            Clear All
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, paddingRight: "0.25rem" }}>
          {loading && (
            <p style={{ fontSize: "0.8rem", color: colors.textSecondary }}>
              Loading columns…
            </p>
          )}
          {error && (
            <p style={{ fontSize: "0.8rem", color: "#ef4444" }}>{error}</p>
          )}
          {!loading &&
            !error &&
            Object.entries(grouped).map(([group, cols]) => {
              const allChecked = cols.every((c) => selected.has(c.id));
              return (
                <div key={group} style={{ marginBottom: "0.75rem" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: 4,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => toggleGroup(cols, e.target.checked)}
                    />
                    {group} ({cols.length})
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "2px 8px",
                      paddingLeft: 4,
                    }}
                  >
                    {cols.map((c) => (
                      <label
                        key={c.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.75rem",
                          color: colors.textPrimary,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggle(c.id)}
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            paddingTop: "0.5rem",
            borderTop: `1px solid ${colors.cardBorder}`,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textPrimary,
              cursor: "pointer",
              fontSize: "0.78rem",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={selected.size === 0}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "none",
              background:
                selected.size === 0
                  ? colors.cardBorder
                  : "linear-gradient(135deg,#10B981,#059669)",
              color: "#fff",
              cursor: selected.size === 0 ? "not-allowed" : "pointer",
              fontSize: "0.78rem",
              fontWeight: 600,
            }}
          >
            Export ({selected.size} columns)
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportColumnsModal;
