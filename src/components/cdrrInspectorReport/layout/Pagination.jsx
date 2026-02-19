// ── Pagination ───────────────────────────────────────────────────────────────

export default function Pagination({
  C,
  page,
  pageSize,
  totalRecords,
  totalPages,
  setPage,
  setPageSize,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "0.9rem",
        fontSize: "0.79rem",
        color: C.txt2,
      }}
    >
      <span>
        Showing{" "}
        <strong style={{ color: C.txt }}>
          {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalRecords)}
        </strong>{" "}
        of <strong style={{ color: C.txt }}>{totalRecords}</strong> records
        &nbsp;&nbsp; Rows:{" "}
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          style={{
            padding: "0.25rem 0.45rem",
            borderRadius: "5px",
            border: `1px solid ${C.inputB}`,
            background: C.input,
            color: C.txt,
            fontSize: "0.79rem",
            cursor: "pointer",
          }}
        >
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </span>

      <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          style={{
            padding: "0.36rem 0.75rem",
            borderRadius: "6px",
            border: `1px solid ${C.border}`,
            background: C.card,
            color: page === 1 ? C.txt3 : C.txt,
            cursor: page === 1 ? "not-allowed" : "pointer",
            fontSize: "0.79rem",
            fontWeight: "600",
          }}
        >
          ← Prev
        </button>

        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "6px",
                border: `1px solid ${page === p ? "#16a34a" : C.border}`,
                background: page === p ? "#16a34a" : C.card,
                color: page === p ? "#fff" : C.txt,
                cursor: "pointer",
                fontSize: "0.79rem",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {p}
            </button>
          );
        })}

        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          style={{
            padding: "0.36rem 0.75rem",
            borderRadius: "6px",
            border: `1px solid ${C.border}`,
            background: C.card,
            color: page >= totalPages ? C.txt3 : C.txt,
            cursor: page >= totalPages ? "not-allowed" : "pointer",
            fontSize: "0.79rem",
            fontWeight: "600",
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
