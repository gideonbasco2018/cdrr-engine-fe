// src/components/fda/FDATableColumns.jsx
function FDATableColumns({ row, columns, colors, isExpired }) {
  return (
    <>
      {columns.map((col) => (
        <td
          key={col.key}
          style={{
            padding: "0.2rem 0.4rem",
            fontSize: "0.65rem",
            color: colors.tableText,
            borderBottom: `1px solid ${colors.tableBorder}`,
            minWidth: col.width,
            maxWidth: col.width,
            whiteSpace: "normal",
            wordBreak: "break-word",
          }}
        >
          {col.key === "expiry_date" && row[col.key] ? (
            <span
              style={{
                padding: "0.15rem 0.35rem",
                borderRadius: "4px",
                fontSize: "0.62rem",
                fontWeight: "600",
                background: isExpired(row[col.key])
                  ? "rgba(244, 67, 54, 0.1)"
                  : "rgba(76, 175, 80, 0.1)",
                color: isExpired(row[col.key]) ? "#f44336" : "#4CAF50",
              }}
            >
              {row[col.key]}
              {isExpired(row[col.key]) && " ⚠️"}
            </span>
          ) : col.key === "date_uploaded" && row[col.key] ? (
            new Date(row[col.key]).toISOString().split("T")[0]
          ) : (
            row[col.key] || "N/A"
          )}
        </td>
      ))}
    </>
  );
}

export default FDATableColumns;
