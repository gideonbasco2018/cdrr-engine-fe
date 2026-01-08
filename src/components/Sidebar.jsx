function Sidebar({ activeMenu, setActiveMenu, darkMode }) {
  const mainMenuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    // { id: 'creator', icon: '👥', label: 'Creator Management' },
    // { id: 'reports', icon: '📄', label: 'Reports' },
  ];

  const cmsReportsItems = [
    // { id: 'cdrr-reports', icon: '📋', label: 'Reports', hasSubmenu: true },
    { id: 'upload', icon: '📤', label: 'Upload Reports' },
    // { id: 'generated', icon: '📑', label: 'Generated Reports' },
  ];

  const platformItems = [
    { id: 'announcements', icon: '📢', label: 'Announcements' },
    { id: 'support', icon: '🎧', label: 'Support' },
    { id: 'access', icon: '🔐', label: 'Access Management' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  // Define color schemes for dark and light modes
  const colors = darkMode ? {
    sidebarBg: '#0f0f0f',
    sidebarBorder: '#1a1a1a',
    textPrimary: '#fff',
    textSecondary: '#999',
    sectionLabel: '#666',
    activeItemBg: '#1a1a1a',
    hoverBg: '#151515'
  } : {
    sidebarBg: '#ffffff',
    sidebarBorder: '#e5e5e5',
    textPrimary: '#000',
    textSecondary: '#666',
    sectionLabel: '#999',
    activeItemBg: '#f5f5f5',
    hoverBg: '#fafafa'
  };

  const MenuItem = ({ item }) => (
    <div
      key={item.id}
      onClick={() => setActiveMenu(item.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1.25rem',
        cursor: 'pointer',
        background: activeMenu === item.id ? colors.activeItemBg : 'transparent',
        color: activeMenu === item.id ? colors.textPrimary : colors.textSecondary,
        transition: 'all 0.2s',
        fontSize: '0.9rem',
        fontWeight: '500'
      }}
      onMouseEnter={(e) => {
        if (activeMenu !== item.id) {
          e.currentTarget.style.background = colors.hoverBg;
          e.currentTarget.style.color = colors.textPrimary;
        }
      }}
      onMouseLeave={(e) => {
        if (activeMenu !== item.id) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = colors.textSecondary;
        }
      }}
    >
      <span style={{ fontSize: '1rem' }}>{item.icon}</span>
      <span>{item.label}</span>
      {item.hasSubmenu && <span style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>▼</span>}
    </div>
  );

  return (
    <div style={{
      width: '240px',
      background: colors.sidebarBg,
      borderRight: `1px solid ${colors.sidebarBorder}`,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      transition: 'all 0.3s ease'
    }}>
      {/* Logo */}
      <div style={{
        padding: '1.5rem 1.25rem',
        borderBottom: `1px solid ${colors.sidebarBorder}`
      }}>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          letterSpacing: '0.1em',
          color: colors.textPrimary,
          transition: 'color 0.3s ease'
        }}>
          FDA
        </div>
      </div>

      {/* MAIN Section */}
      <div style={{ padding: '1.5rem 0' }}>
        <div style={{
          padding: '0 1.25rem',
          fontSize: '0.7rem',
          fontWeight: '600',
          color: colors.sectionLabel,
          letterSpacing: '0.1em',
          marginBottom: '0.5rem',
          transition: 'color 0.3s ease'
        }}>
          MAIN
        </div>
        {mainMenuItems.map((item) => (
          <MenuItem key={item.id} item={item} />
        ))}
      </div>

      {/* CMS Reports Section */}
      <div style={{ padding: '0 0 1.5rem' }}>
        <div style={{
          padding: '0 1.25rem',
          fontSize: '0.7rem',
          fontWeight: '600',
          color: colors.sectionLabel,
          letterSpacing: '0.1em',
          marginBottom: '0.5rem',
          transition: 'color 0.3s ease'
        }}>
          CDRR REPORTS
        </div>
        {cmsReportsItems.map((item) => (
          <MenuItem key={item.id} item={item} />
        ))}
      </div>

      {/* Platform Section */}
      <div style={{ padding: '0 0 1.5rem' }}>
        <div style={{
          padding: '0 1.25rem',
          fontSize: '0.7rem',
          fontWeight: '600',
          color: colors.sectionLabel,
          letterSpacing: '0.1em',
          marginBottom: '0.5rem',
          transition: 'color 0.3s ease'
        }}>
          PLATFORM
        </div>
        {platformItems.map((item) => (
          <MenuItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export default Sidebar;