import { useState, useEffect } from 'react';
import { getUser, getCurrentUser, updateCurrentUser } from '../api/auth';

function ProfilePage({ darkMode }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    surname: '',
    email: '',
    username: '',
    position: ''
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const colors = darkMode ? {
    pageBg: '#0a0a0a',
    cardBg: '#0f0f0f',
    cardBorder: '#1a1a1a',
    inputBg: '#1a1a1a',
    inputBorder: '#2a2a2a',
    textPrimary: '#fff',
    textSecondary: '#999',
    textTertiary: '#666',
    tabActive: '#4CAF50',
    tabInactive: '#666'
  } : {
    pageBg: '#f8f8f8',
    cardBg: '#ffffff',
    cardBorder: '#e5e5e5',
    inputBg: '#ffffff',
    inputBorder: '#e5e5e5',
    textPrimary: '#000',
    textSecondary: '#666',
    textTertiary: '#999',
    tabActive: '#4CAF50',
    tabInactive: '#666'
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setProfileForm({
        first_name: userData.first_name || '',
        surname: userData.surname || '',
        email: userData.email || '',
        username: userData.username || '',
        position: userData.position || ''
      });
    } catch (error) {
      const storedUser = getUser();
      if (storedUser) {
        setUser(storedUser);
        setProfileForm({
          first_name: storedUser.first_name || '',
          surname: storedUser.surname || '',
          email: storedUser.email || '',
          username: storedUser.username || '',
          position: storedUser.position || ''
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);

    try {
      const updated = await updateCurrentUser({
        first_name: profileForm.first_name,
        surname: profileForm.surname,
        position: profileForm.position
      });

      const storage = localStorage.getItem('access_token') ? localStorage : sessionStorage;
      storage.setItem('user', JSON.stringify(updated));
      
      setUser(updated);
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (error) {
      setProfileError(error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    setPasswordLoading(true);

    try {
      await updateCurrentUser({ password: passwordForm.newPassword });
      setPasswordSuccess('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (error) {
      setPasswordError(error);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        flex: 1,
        padding: '2rem',
        background: colors.pageBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.textPrimary
      }}>
        Loading...
      </div>
    );
  }

  const getUserInitial = () => {
    if (user?.first_name) return user.first_name.charAt(0).toUpperCase();
    if (user?.username) return user.username.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: colors.pageBg, transition: 'all 0.3s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '600', marginBottom: '0.5rem', color: colors.textPrimary, transition: 'color 0.3s ease' }}>
          Account Settings
        </h1>
        <p style={{ color: colors.textTertiary, fontSize: '0.9rem', transition: 'color 0.3s ease' }}>
          Manage your profile information and security settings
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', maxWidth: '1200px' }}>
        <div>
          <div style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: '12px', padding: '2rem', textAlign: 'center', transition: 'all 0.3s ease' }}>
            <div style={{ width: '100px', height: '100px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2.5rem', fontWeight: '600', margin: '0 auto 1.5rem' }}>
              {getUserInitial()}
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: colors.textPrimary, marginBottom: '0.5rem', transition: 'color 0.3s ease' }}>
              {user?.first_name && user?.surname ? `${user.first_name} ${user.surname}` : user?.username || 'User'}
            </h2>
            
            {user?.position && (
              <p style={{ color: colors.textSecondary, fontSize: '0.9rem', marginBottom: '0.5rem', transition: 'color 0.3s ease' }}>
                {user.position}
              </p>
            )}
            
            <p style={{ color: colors.textTertiary, fontSize: '0.85rem', transition: 'color 0.3s ease' }}>
              @{user?.username}
            </p>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: `1px solid ${colors.cardBorder}`, transition: 'border-color 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: colors.textSecondary, fontSize: '0.85rem', transition: 'color 0.3s ease' }}>Status</span>
                <span style={{ color: '#4CAF50', fontSize: '0.85rem', fontWeight: '500' }}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textSecondary, fontSize: '0.85rem', transition: 'color 0.3s ease' }}>Member since</span>
                <span style={{ color: colors.textPrimary, fontSize: '0.85rem', transition: 'color 0.3s ease' }}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', borderBottom: `2px solid ${colors.cardBorder}`, transition: 'border-color 0.3s ease' }}>
            <button onClick={() => setActiveTab('profile')} style={{ background: 'none', border: 'none', padding: '1rem 0', fontSize: '1rem', fontWeight: '600', color: activeTab === 'profile' ? colors.tabActive : colors.tabInactive, cursor: 'pointer', borderBottom: activeTab === 'profile' ? `3px solid ${colors.tabActive}` : '3px solid transparent', marginBottom: '-2px', transition: 'all 0.3s ease' }}>
              Profile Information
            </button>
            <button onClick={() => setActiveTab('password')} style={{ background: 'none', border: 'none', padding: '1rem 0', fontSize: '1rem', fontWeight: '600', color: activeTab === 'password' ? colors.tabActive : colors.tabInactive, cursor: 'pointer', borderBottom: activeTab === 'password' ? `3px solid ${colors.tabActive}` : '3px solid transparent', marginBottom: '-2px', transition: 'all 0.3s ease' }}>
              Change Password
            </button>
          </div>

          {activeTab === 'profile' && (
            <div style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: '12px', padding: '2rem', transition: 'all 0.3s ease' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: colors.textPrimary, marginBottom: '1.5rem', transition: 'color 0.3s ease' }}>
                Personal Information
              </h3>

              <form onSubmit={handleProfileSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', color: colors.textSecondary, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500', transition: 'color 0.3s ease' }}>First Name</label>
                    <input type="text" name="first_name" value={profileForm.first_name} onChange={(e) => setProfileForm({...profileForm, first_name: e.target.value})} disabled={profileLoading} style={{ width: '100%', padding: '0.875rem', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: '8px', color: colors.textPrimary, fontSize: '0.95rem', outline: 'none', transition: 'all 0.3s ease', opacity: profileLoading ? 0.6 : 1 }} onFocus={(e) => e.target.style.borderColor = '#4CAF50'} onBlur={(e) => e.target.style.borderColor = colors.inputBorder} />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: colors.textSecondary, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500', transition: 'color 0.3s ease' }}>Surname</label>
                    <input type="text" name="surname" value={profileForm.surname} onChange={(e) => setProfileForm({...profileForm, surname: e.target.value})} disabled={profileLoading} style={{ width: '100%', padding: '0.875rem', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: '8px', color: colors.textPrimary, fontSize: '0.95rem', outline: 'none', transition: 'all 0.3s ease', opacity: profileLoading ? 0.6 : 1 }} onFocus={(e) => e.target.style.borderColor = '#4CAF50'} onBlur={(e) => e.target.style.borderColor = colors.inputBorder} />
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: colors.textSecondary, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500', transition: 'color 0.3s ease' }}>Email Address</label>
                  <input type="email" value={profileForm.email} disabled style={{ width: '100%', padding: '0.875rem', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: '8px', color: colors.textTertiary, fontSize: '0.95rem', outline: 'none', transition: 'all 0.3s ease', opacity: 0.6, cursor: 'not-allowed' }} />
                  <p style={{ color: colors.textTertiary, fontSize: '0.75rem', marginTop: '0.5rem', transition: 'color 0.3s ease' }}>Email cannot be changed</p>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: colors.textSecondary, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500', transition: 'color 0.3s ease' }}>Username</label>
                  <input type="text" value={profileForm.username} disabled style={{ width: '100%', padding: '0.875rem', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: '8px', color: colors.textTertiary, fontSize: '0.95rem', outline: 'none', transition: 'all 0.3s ease', opacity: 0.6, cursor: 'not-allowed' }} />
                  <p style={{ color: colors.textTertiary, fontSize: '0.75rem', marginTop: '0.5rem', transition: 'color 0.3s ease' }}>Username cannot be changed</p>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', color: colors.textSecondary, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500', transition: 'color 0.3s ease' }}>Position / Role</label>
                  <input type="text" value={profileForm.position} onChange={(e) => setProfileForm({...profileForm, position: e.target.value})} placeholder="e.g. Senior Developer, Project Manager" disabled={profileLoading} style={{ width: '100%', padding: '0.875rem', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: '8px', color: colors.textPrimary, fontSize: '0.95rem', outline: 'none', transition: 'all 0.3s ease', opacity: profileLoading ? 0.6 : 1 }} onFocus={(e) => e.target.style.borderColor = '#4CAF50'} onBlur={(e) => e.target.style.borderColor = colors.inputBorder} />
                </div>

                {profileError && (
                  <div style={{ padding: '0.875rem', background: 'rgba(244, 67, 54, 0.1)', border: '1px solid rgba(244, 67, 54, 0.3)', borderRadius: '8px', color: '#f44336', fontSize: '0.9rem', marginBottom: '1rem' }}>{profileError}</div>
                )}

                {profileSuccess && (
                  <div style={{ padding: '0.875rem', background: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)', borderRadius: '8px', color: '#4CAF50', fontSize: '0.9rem', marginBottom: '1rem' }}>{profileSuccess}</div>
                )}

                <button type="submit" disabled={profileLoading} style={{ padding: '0.875rem 2rem', background: profileLoading ? '#999' : '#4CAF50', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', fontWeight: '600', cursor: profileLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { if (!profileLoading) e.target.style.background = '#45a049'; }} onMouseLeave={(e) => { if (!profileLoading) e.target.style.background = '#4CAF50'; }}>
                  {profileLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'password' && (
            <div style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: '12px', padding: '2rem', transition: 'all 0.3s ease' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: colors.textPrimary, marginBottom: '0.5rem', transition: 'color 0.3s ease' }}>Change Password</h3>
              <p style={{ color: colors.textSecondary, fontSize: '0.9rem', marginBottom: '2rem', transition: 'color 0.3s ease' }}>Ensure your password is strong and secure</p>

              <form onSubmit={handlePasswordSubmit}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: colors.textSecondary, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500', transition: 'color 0.3s ease' }}>Current Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showCurrentPassword ? 'text' : 'password'} value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})} required disabled={passwordLoading} style={{ width: '100%', padding: '0.875rem', paddingRight: '3rem', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: '8px', color: colors.textPrimary, fontSize: '0.95rem', outline: 'none', transition: 'all 0.3s ease', opacity: passwordLoading ? 0.6 : 1 }} onFocus={(e) => e.target.style.borderColor = '#4CAF50'} onBlur={(e) => e.target.style.borderColor = colors.inputBorder} />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} disabled={passwordLoading} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: colors.textSecondary, cursor: passwordLoading ? 'not-allowed' : 'pointer', fontSize: '0.85rem', padding: '0.25rem' }}>
                      {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: colors.textSecondary, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500', transition: 'color 0.3s ease' }}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showNewPassword ? 'text' : 'password'} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} required disabled={passwordLoading} style={{ width: '100%', padding: '0.875rem', paddingRight: '3rem', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: '8px', color: colors.textPrimary, fontSize: '0.95rem', outline: 'none', transition: 'all 0.3s ease', opacity: passwordLoading ? 0.6 : 1 }} onFocus={(e) => e.target.style.borderColor = '#4CAF50'} onBlur={(e) => e.target.style.borderColor = colors.inputBorder} />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} disabled={passwordLoading} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: colors.textSecondary, cursor: passwordLoading ? 'not-allowed' : 'pointer', fontSize: '0.85rem', padding: '0.25rem' }}>
                      {showNewPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  <p style={{ color: colors.textTertiary, fontSize: '0.75rem', marginTop: '0.5rem', transition: 'color 0.3s ease' }}>Must be at least 8 characters long</p>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', color: colors.textSecondary, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500', transition: 'color 0.3s ease' }}>Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showConfirmPassword ? 'text' : 'password'} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} required disabled={passwordLoading} style={{ width: '100%', padding: '0.875rem', paddingRight: '3rem', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: '8px', color: colors.textPrimary, fontSize: '0.95rem', outline: 'none', transition: 'all 0.3s ease', opacity: passwordLoading ? 0.6 : 1 }} onFocus={(e) => e.target.style.borderColor = '#4CAF50'} onBlur={(e) => e.target.style.borderColor = colors.inputBorder} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={passwordLoading} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: colors.textSecondary, cursor: passwordLoading ? 'not-allowed' : 'pointer', fontSize: '0.85rem', padding: '0.25rem' }}>
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                {passwordError && (
                  <div style={{ padding: '0.875rem', background: 'rgba(244, 67, 54, 0.1)', border: '1px solid rgba(244, 67, 54, 0.3)', borderRadius: '8px', color: '#f44336', fontSize: '0.9rem', marginBottom: '1rem' }}>{passwordError}</div>
                )}

                {passwordSuccess && (
                  <div style={{ padding: '0.875rem', background: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)', borderRadius: '8px', color: '#4CAF50', fontSize: '0.9rem', marginBottom: '1rem' }}>{passwordSuccess}</div>
                )}

                <button type="submit" disabled={passwordLoading} style={{ padding: '0.875rem 2rem', background: passwordLoading ? '#999' : '#4CAF50', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', fontWeight: '600', cursor: passwordLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { if (!passwordLoading) e.target.style.background = '#45a049'; }} onMouseLeave={(e) => { if (!passwordLoading) e.target.style.background = '#4CAF50'; }}>
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;