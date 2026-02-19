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
  currentUser,
  canEditDrug, // ✅ NEW: Add canEditDrug prop
  toggleDropdown,
  handleViewDetails,
  handleEdit,
  handleCancelClick, // ✅ Changed from handleDeleteClick
  isExpired,
  duplicateRegNums,
}) {
  // ✨ Helper function to check if a drug has duplicate registration number
  const isDuplicateRecord = (drug) => {
    return (
      activeTab === "duplicates" &&
      duplicateRegNums &&
      duplicateRegNums.includes(drug.registration_number?.trim())
    );
  };

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
    <div
      style={{
        overflowX: "auto",
        overflowY: "auto",
        maxHeight: "calc(100vh - 380px)",
      }}
    >
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
                minWidth: "60px",
                maxWidth: "60px",
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
                boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
                width: "180px",
                minWidth: "180px",
                maxWidth: "180px",
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
            const isDuplicate = isDuplicateRecord(row);
            const isExpiredRow = isExpired(row.expiry_date);
            const isCanceled = row.is_canceled === "Y"; // ✅ NEW: Check if canceled

            // Determine background color with priority:
            // 1. Canceled records (red/gray tint)
            // 2. Duplicate records (pink/rose highlight)
            // 3. Expired records (orange/amber tint)
            // 4. Normal alternating rows
            let rowBg;
            if (isCanceled) {
              rowBg = darkMode
                ? "rgba(244, 67, 54, 0.15)" // Red tint for dark mode
                : "rgba(244, 67, 54, 0.08)"; // Light red for light mode
            } else if (isDuplicate) {
              rowBg = darkMode
                ? "rgba(233, 30, 99, 0.15)" // Pink tint for dark mode
                : "rgba(233, 30, 99, 0.08)"; // Light pink for light mode
            } else if (isExpiredRow && activeTab === "expired") {
              rowBg = darkMode
                ? "rgba(255, 152, 0, 0.1)"
                : "rgba(255, 152, 0, 0.05)";
            } else {
              rowBg =
                index % 2 === 0 ? colors.tableRowEven : colors.tableRowOdd;
            }

            return (
              <tr
                key={row.id}
                style={{
                  background: rowBg,
                  transition: "background 0.2s",
                  // ✅ NEW: Add colored left border based on status
                  borderLeft: isCanceled
                    ? "4px solid #f44336"
                    : isDuplicate
                      ? "4px solid #E91E63"
                      : "4px solid transparent",
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
                    fontWeight: isDuplicate || isCanceled ? "700" : "600",
                    color: isCanceled
                      ? "#f44336"
                      : isDuplicate
                        ? "#E91E63"
                        : colors.textPrimary,
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    background: rowBg,
                    boxShadow: "2px 0 5px rgba(0,0,0,0.05)",
                  }}
                >
                  {row.registration_number || "N/A"}
                  {/* ✅ NEW: Show canceled badge */}
                  {isCanceled && (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        background: "#f44336",
                        color: "#fff",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        fontWeight: "600",
                        textTransform: "uppercase",
                      }}
                    >
                      Canceled
                    </span>
                  )}
                  {/* Show duplicate badge only if not canceled */}
                  {isDuplicate && !isCanceled && (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        background: "#E91E63",
                        color: "#fff",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        fontWeight: "600",
                        textTransform: "uppercase",
                      }}
                    >
                      Duplicate
                    </span>
                  )}
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
                      onCancel={() =>
                        // ✅ Changed from onDelete
                        handleCancelClick(
                          row.id,
                          row.brand_name || row.generic_name,
                          isCanceled, // ✅ NEW: Pass canceled status
                        )
                      }
                      drugName={row.brand_name || row.generic_name}
                      isCanceled={isCanceled} // ✅ NEW: Pass canceled status
                      activeTab={activeTab}
                      darkMode={darkMode}
                      buttonRef={buttonRefs.current[row.id]}
                      currentUser={currentUser}
                      uploadedBy={row.uploaded_by}
                      canEdit={canEditDrug(row)} // ✅ NEW: Pass canEdit status
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
