function Navbar({ darkMode, setDarkMode }) {
  // Define color schemes for dark and light modes
  const colors = darkMode ? {
    navbarBg: '#0f0f0f',
    navbarBorder: '#1a1a1a',
    buttonBg: '#1a1a1a',
    buttonBgHover: '#222',
    buttonColor: '#999',
    buttonColorHover: '#fff',
    divider: '#1a1a1a',
    textPrimary: '#fff',
    textSecondary: '#666',
    notificationDot: '#4CAF50'
  } : {
    navbarBg: '#ffffff',
    navbarBorder: '#e5e5e5',
    buttonBg: '#f5f5f5',
    buttonBgHover: '#e5e5e5',
    buttonColor: '#666',
    buttonColorHover: '#000',
    divider: '#e5e5e5',
    textPrimary: '#000',
    textSecondary: '#666',
    notificationDot: '#4CAF50'
  };

  return (
    <div style={{
      height: '70px',
      background: colors.navbarBg,
      borderBottom: `1px solid ${colors.navbarBorder}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ flex: 1 }}></div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            width: '40px',
            height: '40px',
            background: colors.buttonBg,
            border: 'none',
            borderRadius: '8px',
            color: colors.buttonColor,
            cursor: 'pointer',
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = colors.buttonBgHover;
            e.target.style.color = colors.buttonColorHover;
          }}
          onMouseLeave={(e) => {
            e.target.style.background = colors.buttonBg;
            e.target.style.color = colors.buttonColor;
          }}
        >
          {darkMode ? '🌙' : '☀️'}
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button style={{
            width: '40px',
            height: '40px',
            background: colors.buttonBg,
            border: 'none',
            borderRadius: '8px',
            color: colors.buttonColor,
            cursor: 'pointer',
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}>
            🔔
          </button>
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '8px',
            height: '8px',
            background: colors.notificationDot,
            borderRadius: '50%',
            border: `2px solid ${colors.navbarBg}`
          }} />
        </div>

        <div style={{
          width: '1px',
          height: '30px',
          background: colors.divider
        }} />

        {/* User Profile */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          cursor: 'pointer',
          padding: '0.5rem',
          borderRadius: '8px',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = colors.buttonBg}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <span style={{
            fontSize: '0.9rem',
            fontWeight: '500',
            color: colors.textPrimary,
            transition: 'color 0.3s ease'
          }}>
            Developer Team
          </span>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '0.85rem',
            fontWeight: '600'
          }}>
            D
          </div>
          <span style={{ 
            color: colors.textSecondary, 
            fontSize: '0.8rem',
            transition: 'color 0.3s ease'
          }}>▼</span>
        </div>
      </div>
    </div>
  );
}

export default Navbar;