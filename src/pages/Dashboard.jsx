import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import DashboardPage from './DashboardPage';
import UploadReportsPage from './UploadReportsPage';

function Dashboard() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);

  // Define color schemes for dark and light modes
  const colors = darkMode ? {
    mainBg: '#0a0a0a',
    textPrimary: '#fff'
  } : {
    mainBg: '#f8f8f8',
    textPrimary: '#000'
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: colors.mainBg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden',
      color: colors.textPrimary,
      transition: 'all 0.3s ease'
    }}>
      {/* Sidebar */}
      <Sidebar 
        activeMenu={activeMenu} 
        setActiveMenu={setActiveMenu}
        darkMode={darkMode}
      />

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Top Navbar */}
        <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />

        {/* Content Area - Conditionally render based on activeMenu */}
        {activeMenu === 'upload' ? (
          <UploadReportsPage darkMode={darkMode} />
        ) : (
          <DashboardPage darkMode={darkMode} />
        )}
      </div>
    </div>
  );
}

export default Dashboard;