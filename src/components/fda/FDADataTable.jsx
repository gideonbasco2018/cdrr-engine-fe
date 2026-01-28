// src/components/fda/FDADataTable.jsx
import FDATableColumns from "./FDATableColumns";
import FDAActionDropdown from "./actions/FDAActionDropdown";

function FDADataTable({
  filteredData,
  columns,
  colors,
  currentPage,
  pageSize,
  loading,
  openDropdown,
  buttonRefs,
  activeTab,
  darkMode,
  toggleDropdown,
  handleViewDetails,
  handleEdit,
  handleDeleteClick,
  isExpired,
}) {
  if (filteredData.length === 0) {
    return (
      <div
        style={{
          padding: "4rem 2rem",
          textAlign: "center",
          color: colors.textTertiary,
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
        <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
          {loading ? "Loading..." : "No data found"}
        </p>
        {!loading && (
          <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
            Try adjusting your filters or search terms
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", overflow: "auto", maxHeight: "600px" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          minWidth: "2900px",
        }}
      >
        <thead
          style={{
            position: "sticky",
            top: 0,
            background: colors.tableBg,
            zIndex: 20,
          }}
        >
          <tr>
            {/* Frozen: # */}
            <th
              style={{
                position: "sticky",
                left: 0,
                zIndex: 21,
                padding: "1rem",
                textAlign: "center",
                fontSize: "0.8rem",
                fontWeight: "600",
                color: colors.textTertiary,
                textTransform: "uppercase",
                borderBottom: `1px solid ${colors.tableBorder}`,
                background: colors.tableBg,
                width: "60px",
                boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
              }}
            >
              #
            </th>

            {/* Frozen: Registration Number */}
            <th
              style={{
                position: "sticky",
                left: "60px",
                zIndex: 21,
                padding: "1rem",
                textAlign: "left",
                fontSize: "0.8rem",
                fontWeight: "600",
                color: colors.textTertiary,
                textTransform: "uppercase",
                borderBottom: `1px solid ${colors.tableBorder}`,
                background: colors.tableBg,
                minWidth: "170px",
                boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
              }}
            >
              Registration Number
            </th>

            {/* Regular Columns */}
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: "1rem",
                  textAlign: "left",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  color: colors.textTertiary,
                  textTransform: "uppercase",
                  borderBottom: `1px solid ${colors.tableBorder}`,
                  background: colors.tableBg,
                  minWidth: col.width,
                  whiteSpace: "nowrap",
                }}
              >
                {col.label}
              </th>
            ))}

            {/* Frozen: Actions */}
            <th
              style={{
                position: "sticky",
                right: 0,
                zIndex: 21,
                padding: "1rem",
                textAlign: "center",
                fontSize: "0.8rem",
                fontWeight: "600",
                color: colors.textTertiary,
                textTransform: "uppercase",
                borderBottom: `1px solid ${colors.tableBorder}`,
                background: colors.tableBg,
                width: "100px",
                boxShadow: "-2px 0 5px rgba(0,0,0,0.1)",
              }}
            >
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {filteredData.map((row, index) => {
            const rowBg =
              index % 2 === 0 ? colors.tableRowEven : colors.tableRowOdd;

            return (
              <tr
                key={row.id}
                style={{
                  background: rowBg,
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.tableRowHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = rowBg;
                }}
              >
                {/* Frozen: # */}
                <td
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 10,
                    padding: "1rem",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    color: colors.textTertiary,
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    textAlign: "center",
                    background: rowBg,
                    boxShadow: "2px 0 5px rgba(0,0,0,0.05)",
                  }}
                >
                  {(currentPage - 1) * pageSize + index + 1}
                </td>

                {/* Frozen: Registration Number */}
                <td
                  style={{
                    position: "sticky",
                    left: "60px",
                    zIndex: 10,
                    padding: "1rem",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    background: rowBg,
                    boxShadow: "2px 0 5px rgba(0,0,0,0.05)",
                  }}
                >
                  {row.registration_number || "N/A"}
                </td>

                {/* Regular Columns */}
                <FDATableColumns
                  row={row}
                  columns={columns}
                  colors={colors}
                  isExpired={isExpired}
                />

                {/* Frozen: Actions */}
                <td
                  style={{
                    position: "sticky",
                    right: 0,
                    zIndex: 10,
                    padding: "1rem",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    textAlign: "center",
                    background: rowBg,
                    boxShadow: "-2px 0 5px rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      display: "inline-block",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      ref={(el) => {
                        if (el) buttonRefs.current[row.id] = el;
                      }}
                      onClick={() => toggleDropdown(row.id)}
                      disabled={loading}
                      style={{
                        padding: "0.5rem",
                        background: "transparent",
                        border: "none",
                        cursor: loading ? "not-allowed" : "pointer",
                        fontSize: "1.2rem",
                        color: colors.textPrimary,
                        opacity: loading ? 0.5 : 1,
                      }}
                    >
                      ⋮
                    </button>

                    <FDAActionDropdown
                      isOpen={openDropdown === row.id}
                      onClose={() => toggleDropdown(null)}
                      onViewDetails={() => handleViewDetails(row.id)}
                      onEdit={() => handleEdit(row.id)}
                      onDelete={() =>
                        handleDeleteClick(
                          row.id,
                          row.brand_name || row.generic_name,
                        )
                      }
                      drugName={row.brand_name || row.generic_name}
                      activeTab={activeTab}
                      darkMode={darkMode}
                      buttonRef={buttonRefs.current[row.id]}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default FDADataTable;
