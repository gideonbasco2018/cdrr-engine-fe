import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login({ username, password });
      const { access_token, user } = data;

      // Store token and user info
      if (rememberMe) {
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userRole', user.role); // ADD THIS - explicit role storage
      } else {
        sessionStorage.setItem('access_token', access_token);
        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('userRole', user.role); // ADD THIS
      }

      // Redirect based on role - ADD THIS
      switch(user.role) {
        case 'SuperAdmin':
          navigate('/superadmin/dashboard');
          break;
        case 'Admin':
          navigate('/admin/dashboard');
          break;
        case 'User':
        default:
          navigate('/dashboard');
          break;
      }
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Left Side - Branding */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '4rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 30% 50%, rgba(76, 175, 80, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '700',
            color: '#fff',
            marginBottom: '2rem',
            letterSpacing: '0.1em'
          }}>
            FDA-CDRR
          </h1>
          
          <div style={{ marginTop: '3rem' }}>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: '600',
              color: '#fff',
              marginBottom: '1rem'
            }}>
              Real-time Monitoring
            </h2>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: '600',
              color: '#fff',
              marginBottom: '2rem'
            }}>
              & Analytics Dashboard
            </h2>
            
            <p style={{
              fontSize: '1rem',
              color: '#999',
              lineHeight: '1.6',
              maxWidth: '400px',
              margin: '0 auto'
            }}>
              Track drug registrations, adverse events,
              <br />
              and regulatory compliance in one unified platform
            </p>
          </div>

          <div style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'center',
            marginTop: '3rem'
          }}>
            <div style={{
              width: '40px',
              height: '3px',
              background: '#4CAF50',
              borderRadius: '2px'
            }} />
            <div style={{
              width: '8px',
              height: '3px',
              background: '#333',
              borderRadius: '2px'
            }} />
            <div style={{
              width: '8px',
              height: '3px',
              background: '#333',
              borderRadius: '2px'
            }} />
            <div style={{
              width: '8px',
              height: '3px',
              background: '#333',
              borderRadius: '2px'
            }} />
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div style={{
        flex: 1,
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '4rem',
        maxWidth: '600px'
      }}>
        <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '600',
            color: '#fff',
            marginBottom: '0.5rem',
            textAlign: 'center'
          }}>
            WELCOME BACK
          </h2>
          
          <p style={{
            color: '#666',
            marginBottom: '2.5rem',
            textAlign: 'center',
            fontSize: '0.9rem'
          }}>
            Enter your username and password below to sign in
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: '#999',
                fontSize: '0.85rem',
                marginBottom: '0.5rem',
                fontWeight: '500'
              }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  opacity: loading ? 0.6 : 1
                }}
                onFocus={(e) => e.target.style.borderColor = '#4CAF50'}
                onBlur={(e) => e.target.style.borderColor = '#2a2a2a'}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: '#999',
                fontSize: '0.85rem',
                marginBottom: '0.5rem',
                fontWeight: '500'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    paddingRight: '3rem',
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    opacity: loading ? 0.6 : 1
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4CAF50'}
                  onBlur={(e) => e.target.style.borderColor = '#2a2a2a'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{
                    position: 'absolute',
                    right: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    padding: '0.25rem'
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                color: '#999',
                fontSize: '0.9rem',
                opacity: loading ? 0.6 : 1
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    accentColor: '#4CAF50'
                  }}
                />
                Remember Me
              </label>
              
              <div 
                onClick={() => !loading && alert('Forgot password functionality')}
                style={{
                  color: '#666',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  transition: 'color 0.2s',
                  opacity: loading ? 0.6 : 1
                }}
                onMouseEnter={(e) => !loading && (e.target.style.color = '#4CAF50')}
                onMouseLeave={(e) => e.target.style.color = '#666'}
              >
                Forgot password?
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: loading ? '#999' : '#fff',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                marginBottom: '1rem'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = '#f0f0f0';
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.background = '#fff';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {error && (
              <div style={{
                padding: '0.875rem',
                background: 'rgba(244, 67, 54, 0.1)',
                border: '1px solid rgba(244, 67, 54, 0.3)',
                borderRadius: '8px',
                color: '#f44336',
                fontSize: '0.9rem',
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}
          </form>

          <p style={{
            textAlign: 'center',
            color: '#666',
            fontSize: '0.9rem',
            marginTop: '2rem'
          }}>
            Don't have an account?{' '}
            <span 
              onClick={() => alert('Sign up functionality')}
              style={{
                color: '#4CAF50',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Sign up here
            </span>
          </p>

          <p style={{
            textAlign: 'center',
            marginTop: '2rem'
          }}>
            <span 
              onClick={() => alert('Privacy Policy')}
              style={{
                color: '#666',
                cursor: 'pointer',
                fontSize: '0.85rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = '#999'}
              onMouseLeave={(e) => e.target.style.color = '#666'}
            >
              Privacy Policy
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;