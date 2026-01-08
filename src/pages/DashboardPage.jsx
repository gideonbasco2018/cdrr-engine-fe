function DashboardPage({ darkMode }) {
  // Define color schemes for dark and light modes
  const colors = darkMode ? {
    pageBg: '#0a0a0a',
    cardBg: '#0f0f0f',
    cardBorder: '#1a1a1a',
    cardBorderHover: '#2a2a2a',
    textPrimary: '#fff',
    textSecondary: '#999',
    textTertiary: '#666',
    inputBg: '#1a1a1a',
    inputBorder: '#2a2a2a',
    chartBorderDashed: '#1a1a1a',
    pieCenterBg: '#0f0f0f',
  } : {
    pageBg: '#f8f8f8',
    cardBg: '#ffffff',
    cardBorder: '#e5e5e5',
    cardBorderHover: '#d0d0d0',
    textPrimary: '#000',
    textSecondary: '#666',
    textTertiary: '#999',
    inputBg: '#ffffff',
    inputBorder: '#e5e5e5',
    chartBorderDashed: '#e5e5e5',
    pieCenterBg: '#ffffff',
  };

  const topEarners = [
    { name: 'Emma Lopez', amount: '$62,850.00', percentage: '28.5%', rank: 1 },
    { name: 'Sarah Johnson', amount: '$58,420.00', percentage: '26.5%', rank: 2 },
    { name: 'Michael Chen', amount: '$54,320.00', percentage: '24.7%', rank: 3 },
  ];

  return (
    <div style={{
      flex: 1,
      padding: '2rem',
      overflowY: 'auto',
      background: colors.pageBg,
      transition: 'all 0.3s ease'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            color: colors.textPrimary,
            transition: 'color 0.3s ease'
          }}>
            Platform Overview
          </h1>
          <p style={{
            color: colors.textTertiary,
            fontSize: '0.9rem',
            transition: 'color 0.3s ease'
          }}>
            Monitor and manage all services and users
          </p>
        </div>
        <button style={{
          padding: '0.75rem 1.5rem',
          background: '#4CAF50',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '0.9rem',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#45a049';
          e.target.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = '#4CAF50';
          e.target.style.transform = 'translateY(0)';
        }}>
          <span>📤</span>
          Upload Reports
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {[
          { icon: '👥', label: 'Total Creators', value: '7', change: '8.7%', color: '#3b82f6' },
          { icon: '💰', label: 'Total Revenue', value: '7.0M', change: '8.7%', color: '#10b981' },
          { icon: '💳', label: 'FDAPay', value: '4.5M', change: '8.7%', color: '#10b981' },
          { icon: '⚡', label: 'FDABoost', value: '1.2M', change: '8.7%', color: '#3b82f6' },
          { icon: '🛡️', label: 'FDAShield', value: '1.3M', change: '8.7%', color: '#8b5cf6' }
        ].map((stat, index) => (
          <div key={index} style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: '12px',
            padding: '1.25rem',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = colors.cardBorderHover;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = colors.cardBorder;
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                background: stat.color + '20',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem'
              }}>
                {stat.icon}
              </div>
              <span style={{
                color: colors.textSecondary,
                fontSize: '0.85rem',
                fontWeight: '500',
                transition: 'color 0.3s ease'
              }}>
                {stat.label}
              </span>
            </div>
            <div style={{
              fontSize: '1.75rem',
              fontWeight: '600',
              color: colors.textPrimary,
              marginBottom: '0.5rem',
              transition: 'color 0.3s ease'
            }}>
              {stat.value}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{
                color: '#4CAF50',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}>
                {stat.change}
              </span>
              <span style={{
                color: colors.textTertiary,
                fontSize: '0.8rem',
                transition: 'color 0.3s ease'
              }}>
                this month
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Overview & Services Revenue */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* Revenue Overview Chart */}
        <div style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: '12px',
          padding: '1.5rem',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              color: colors.textPrimary,
              transition: 'color 0.3s ease'
            }}>
              Revenue Overview
            </h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <select style={{
                padding: '0.5rem 1rem',
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: '6px',
                color: colors.textPrimary,
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}>
                <option>All Services</option>
              </select>
              <select style={{
                padding: '0.5rem 1rem',
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: '6px',
                color: colors.textPrimary,
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}>
                <option>2025</option>
              </select>
            </div>
          </div>
          <div style={{
            height: '250px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textTertiary,
            border: `1px dashed ${colors.chartBorderDashed}`,
            borderRadius: '8px',
            transition: 'all 0.3s ease'
          }}>
            📈 Chart Area
          </div>
        </div>

        {/* Services Revenue Pie */}
        <div style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: '12px',
          padding: '1.5rem',
          transition: 'all 0.3s ease'
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            color: colors.textPrimary,
            marginBottom: '1.5rem',
            transition: 'color 0.3s ease'
          }}>
            Services Revenue
          </h3>
          <div style={{
            width: '180px',
            height: '180px',
            margin: '0 auto 1.5rem',
            borderRadius: '50%',
            background: 'conic-gradient(#10b981 0deg 210deg, #3b82f6 210deg 238deg, #8b5cf6 238deg 360deg)',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '120px',
              height: '120px',
              background: colors.pieCenterBg,
              borderRadius: '50%',
              transition: 'background 0.3s ease'
            }} />
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            {[
              { label: 'FDAPay AdSense', percent: '58.1%', color: '#10b981' },
              { label: 'FDABoost', percent: '7.8%', color: '#3b82f6' },
              { label: 'FDAShield', percent: '34.4%', color: '#8b5cf6' }
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: item.color
                  }} />
                  <span style={{ 
                    color: colors.textSecondary,
                    transition: 'color 0.3s ease'
                  }}>{item.label}</span>
                </div>
                <span style={{ color: item.color, fontWeight: '600' }}>
                  {item.percent}
                </span>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: `1px solid ${colors.cardBorder}`,
            textAlign: 'center',
            transition: 'border-color 0.3s ease'
          }}>
            <div style={{ 
              color: colors.textTertiary, 
              fontSize: '0.8rem', 
              marginBottom: '0.25rem',
              transition: 'color 0.3s ease'
            }}>
              Total:
            </div>
            <div style={{ 
              color: colors.textPrimary, 
              fontSize: '1.25rem', 
              fontWeight: '600',
              transition: 'color 0.3s ease'
            }}>
              $98.30
            </div>
          </div>
        </div>
      </div>

      {/* Top Earners */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.25rem'
      }}>
        {/* FDAPay Top Earners */}
        <div style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: '12px',
          padding: '1.5rem',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}>💰</span>
            <div>
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: colors.textPrimary,
                transition: 'color 0.3s ease'
              }}>
                FDAPay Adsense Top Earners
              </h3>
              <p style={{
                color: colors.textTertiary,
                fontSize: '0.8rem',
                transition: 'color 0.3s ease'
              }}>
                Earnings from YouTube channels connected to
              </p>
            </div>
          </div>
          {topEarners.map((earner) => (
            <div key={earner.rank} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 0',
              borderBottom: earner.rank < 3 ? `1px solid ${colors.cardBorder}` : 'none'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: earner.rank === 1 ? '#10b981' : colors.inputBg,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: earner.rank === 1 ? '#fff' : colors.textPrimary,
                transition: 'all 0.3s ease'
              }}>
                {earner.rank}
              </div>
              <div style={{
                width: '36px',
                height: '36px',
                background: colors.cardBorderHover,
                borderRadius: '50%',
                transition: 'background 0.3s ease'
              }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  color: colors.textPrimary,
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  marginBottom: '0.25rem',
                  transition: 'color 0.3s ease'
                }}>
                  {earner.name}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  color: '#10b981',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  marginBottom: '0.25rem'
                }}>
                  {earner.amount}
                </div>
                <div style={{
                  color: '#10b981',
                  fontSize: '0.8rem'
                }}>
                  {earner.percentage}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FDABoost Top Earners */}
        <div style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: '12px',
          padding: '1.5rem',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}>⚡</span>
            <div>
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: colors.textPrimary,
                transition: 'color 0.3s ease'
              }}>
                FDABoost Top Earners
              </h3>
              <p style={{
                color: colors.textTertiary,
                fontSize: '0.8rem',
                transition: 'color 0.3s ease'
              }}>
                Earnings from protected contents
              </p>
            </div>
          </div>
          {topEarners.map((earner) => (
            <div key={earner.rank} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 0',
              borderBottom: earner.rank < 3 ? `1px solid ${colors.cardBorder}` : 'none'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: earner.rank === 1 ? '#3b82f6' : colors.inputBg,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: earner.rank === 1 ? '#fff' : colors.textPrimary,
                transition: 'all 0.3s ease'
              }}>
                {earner.rank}
              </div>
              <div style={{
                width: '36px',
                height: '36px',
                background: colors.cardBorderHover,
                borderRadius: '50%',
                transition: 'background 0.3s ease'
              }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  color: colors.textPrimary,
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  marginBottom: '0.25rem',
                  transition: 'color 0.3s ease'
                }}>
                  {earner.name}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  color: '#3b82f6',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  marginBottom: '0.25rem'
                }}>
                  {earner.amount}
                </div>
                <div style={{
                  color: '#3b82f6',
                  fontSize: '0.8rem'
                }}>
                  {earner.percentage}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;