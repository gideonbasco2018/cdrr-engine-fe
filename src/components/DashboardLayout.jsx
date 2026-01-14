// src/components/DashboardLayout.jsx
import { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import DashboardPage from '../pages/DashboardPage';
import UploadReportsPage from '../pages/UploadReportsPage';
import ProfilePage from '../pages/ProfilePage';

function DashboardLayout({ userRole = 'User' }) {  // ADD userRole prop
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

  // Function to render content based on active menu
  const renderContent = () => {
    switch (activeMenu) {
      case 'profile':
        return <ProfilePage darkMode={darkMode} userRole={userRole} />;
      case 'upload':
        return <UploadReportsPage darkMode={darkMode} userRole={userRole} />;
      case 'dashboard':
      default:
        return <DashboardPage darkMode={darkMode} userRole={userRole} />;
    }
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
        userRole={userRole}  // Pass userRole to Sidebar
      />

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Top Navbar */}
        <Navbar 
          darkMode={darkMode} 
          setDarkMode={setDarkMode}
          setActiveMenu={setActiveMenu}
          userRole={userRole}  // Pass userRole to Navbar
        />

        {/* Content Area - Conditionally render based on activeMenu */}
        {renderContent()}
      </div>
    </div>
  );
}

export default DashboardLayout;