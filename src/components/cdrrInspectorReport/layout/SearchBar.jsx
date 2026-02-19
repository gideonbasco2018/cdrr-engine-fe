// ── SearchBar ────────────────────────────────────────────────────────────────

export default function SearchBar({
  C,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  onClear,
  onPageReset,
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0.6rem",
        marginBottom: "1.1rem",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: "0.8rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: C.txt3,
            fontSize: "0.85rem",
            pointerEvents: "none",
          }}
        >
          🔍
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onPageReset();
          }}
          placeholder="Search by DTN, Importer, LTO, Manufacturer, Certificate..."
          style={{
            width: "100%",
            padding: "0.6rem 1rem 0.6rem 2.4rem",
            borderRadius: "8px",
            border: `1px solid ${C.inputB}`,
            background: C.input,
            color: C.txt,
            fontSize: "0.81rem",
            outline: "none",
            boxSizing: "border-box",
            transition: "all 0.13s",
            boxShadow: C.shadow,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#16a34a";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = C.inputB;
            e.currentTarget.style.boxShadow = C.shadow;
          }}
        />
      </div>

      <select
        value={statusFilter}
        onChange={(e) => {
          setStatusFilter(e.target.value);
          onPageReset();
        }}
        style={{
          padding: "0.6rem 0.9rem",
          borderRadius: "8px",
          border: `1px solid ${C.inputB}`,
          background: C.input,
          color: C.txt,
          fontSize: "0.81rem",
          minWidth: "135px",
          cursor: "pointer",
          boxShadow: C.shadow,
        }}
      >
        <option value="">All Status</option>
        <option value="Pending">Pending</option>
        <option value="In Progress">In Progress</option>
        <option value="Completed">Completed</option>
        <option value="Cancelled">Cancelled</option>
      </select>

      {(statusFilter || search) && (
        <button
          onClick={onClear}
          style={{
            padding: "0.6rem 0.85rem",
            borderRadius: "8px",
            border: `1px solid #ef4444`,
            background: "transparent",
            color: "#ef4444",
            fontSize: "0.81rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}
