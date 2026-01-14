function StatsCard({ stats, colors }) {
  const cards = [
    {
      icon: '📊',
      label: 'Total Reports',
      value: stats.total,
      color: '#3b82f6',
      bgColor: darkMode => darkMode ? '#1e3a8a20' : '#dbeafe'
    },
    {
      icon: '✅',
      label: 'Approved',
      value: stats.approved,
      color: '#10b981',
      bgColor: darkMode => darkMode ? '#05462420' : '#d1fae5'
    },
    {
      icon: '⏳',
      label: 'Pending',
      value: stats.pending,
      color: '#f59e0b',
      bgColor: darkMode => darkMode ? '#78350f20' : '#fef3c7'
    },
    {
      icon: '❌',
      label: 'Rejected',
      value: stats.rejected,
      color: '#ef4444',
      bgColor: darkMode => darkMode ? '#7f1d1d20' : '#fee2e2'
    },
    {
      icon: '⏸️',
      label: 'Not yet Decked',
      value: stats.notDecked,
      color: '#6b7280',
      bgColor: darkMode => darkMode ? '#1f292920' : '#f3f4f6'
    },
    {
      icon: '📝',
      label: 'Partially Decked',
      value: stats.partiallyDecked,
      color: '#8b5cf6',
      bgColor: darkMode => darkMode ? '#4c1d9520' : '#ede9fe'
    },
    {
      icon: '✓',
      label: 'Decked',
      value: stats.decked,
      color: '#06b6d4',
      bgColor: darkMode => darkMode ? '#08404820' : '#cffafe'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '1rem',
      marginBottom: '2rem'
    }}>
      {cards.map((card, index) => (
        <div
          key={index}
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = colors.cardShadow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            background: card.bgColor(colors.pageBg === '#1a1a1a'),
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            flexShrink: 0
          }}>
            {card.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.8rem',
              color: colors.textTertiary,
              marginBottom: '0.25rem',
              fontWeight: '500',
              transition: 'color 0.3s ease'
            }}>
              {card.label}
            </div>
            <div style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: colors.textPrimary,
              lineHeight: 1,
              transition: 'color 0.3s ease'
            }}>
              {card.value.toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatsCard;