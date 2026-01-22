import { useState } from 'react';

function TablePagination({
  currentPage,
  rowsPerPage,
  totalRecords,
  totalPages,
  indexOfFirstRow,
  indexOfLastRow,
  onPageChange,
  onRowsPerPageChange,
  colors
}) {
  const [pageInput, setPageInput] = useState(String(currentPage));

  const handlePageInputChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setPageInput(value);
    }
  };

  const handlePageJump = () => {
    const pageNum = parseInt(pageInput);
    if (pageNum && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handlePageInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handlePageJump();
      e.target.blur();
    }
  };

  return (
    <div style={{
      padding: '1rem 1.5rem',
      borderTop: `1px solid ${colors.tableBorder}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: colors.textTertiary,
        fontSize: '0.85rem',
        transition: 'color 0.3s ease'
      }}>
        <span>Rows per page:</span>
        <select 
          value={rowsPerPage}
          onChange={onRowsPerPageChange}
          style={{
            padding: '0.4rem 0.8rem',
            background: colors.inputBg,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: '6px',
            color: colors.textPrimary,
            fontSize: '0.85rem',
            cursor: 'pointer',
            outline: 'none',
            transition: 'all 0.3s ease'
          }}>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <span style={{
          color: colors.textTertiary,
          fontSize: '0.85rem',
          transition: 'color 0.3s ease'
        }}>
          Page
        </span>
        <input
          type="text"
          value={pageInput}
          onChange={handlePageInputChange}
          onKeyPress={handlePageInputKeyPress}
          onBlur={(e) => {
            e.target.style.borderColor = colors.inputBorder;
            handlePageJump();
          }}
          style={{
            width: '60px',
            padding: '0.4rem 0.6rem',
            background: colors.inputBg,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: '6px',
            color: colors.textPrimary,
            fontSize: '0.85rem',
            textAlign: 'center',
            outline: 'none',
            transition: 'all 0.2s'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#4CAF50';
            e.target.select();
          }}
        />
        <span style={{
          color: colors.textTertiary,
          fontSize: '0.85rem',
          transition: 'color 0.3s ease'
        }}>
          of {totalPages}
        </span>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <span style={{
          color: colors.textTertiary,
          fontSize: '0.85rem',
          transition: 'color 0.3s ease'
        }}>
          {indexOfFirstRow}-{indexOfLastRow} of {totalRecords}
        </span>
        <div style={{
          display: 'flex',
          gap: '0.5rem'
        }}>
          <button 
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              width: '32px',
              height: '32px',
              background: colors.buttonSecondaryBg,
              border: `1px solid ${colors.buttonSecondaryBorder}`,
              borderRadius: '6px',
              color: currentPage === 1 ? colors.textTertiary : colors.textPrimary,
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              transition: 'all 0.3s ease',
              opacity: currentPage === 1 ? 0.5 : 1
            }}>
            ‹
          </button>
          <button 
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              width: '32px',
              height: '32px',
              background: colors.buttonSecondaryBg,
              border: `1px solid ${colors.buttonSecondaryBorder}`,
              borderRadius: '6px',
              color: currentPage === totalPages ? colors.textTertiary : colors.textPrimary,
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              transition: 'all 0.3s ease',
              opacity: currentPage === totalPages ? 0.5 : 1
            }}>
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

export default TablePagination;