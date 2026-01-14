function FilterBar({ searchTerm, onSearchChange, colors }) {
  return (
    <div style={{
      background: colors.cardBg,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: '12px',
      padding: '1.25rem',
      marginBottom: '1.5rem',
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1', minWidth: '250px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: '8px',
                color: colors.textPrimary,
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4CAF50'}
              onBlur={(e) => e.target.style.borderColor = colors.inputBorder}
            />
            <span style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.textTertiary,
              fontSize: '1rem'
            }}>
              🔍
            </span>
          </div>
        </div>
        <select style={{
          padding: '0.75rem 1rem',
          background: colors.inputBg,
          border: `1px solid ${colors.inputBorder}`,
          borderRadius: '8px',
          color: colors.textPrimary,
          fontSize: '0.9rem',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.3s ease'
        }}>
          <option>All Categories</option>
          <option>Pharmacy</option>
          <option>Hospital</option>
          <option>Drugstore</option>
        </select>
        <select style={{
          padding: '0.75rem 1rem',
          background: colors.inputBg,
          border: `1px solid ${colors.inputBorder}`,
          borderRadius: '8px',
          color: colors.textPrimary,
          fontSize: '0.9rem',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.3s ease'
        }}>
          <option>All Status</option>
          <option>Approved</option>
          <option>Pending</option>
          <option>Rejected</option>
        </select>
      </div>
    </div>
  );
}

export default FilterBar;