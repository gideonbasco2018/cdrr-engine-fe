import { useState } from 'react';

function UploadReportsPage({ darkMode }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);

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
    buttonSecondaryBg: '#1a1a1a',
    buttonSecondaryBorder: '#2a2a2a',
    buttonSecondaryBgHover: '#222',
    buttonSecondaryBorderHover: '#333',
    tableBg: '#0f0f0f',
    tableRowEven: '#0a0a0a',
    tableRowOdd: '#0f0f0f',
    tableRowHover: '#151515',
    tableBorder: '#1a1a1a',
    tableText: '#ccc',
    badgeBg: '#1a1a1a',
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
    buttonSecondaryBg: '#f5f5f5',
    buttonSecondaryBorder: '#e5e5e5',
    buttonSecondaryBgHover: '#e5e5e5',
    buttonSecondaryBorderHover: '#d0d0d0',
    tableBg: '#ffffff',
    tableRowEven: '#ffffff',
    tableRowOdd: '#fafafa',
    tableRowHover: '#f0f0f0',
    tableBorder: '#e5e5e5',
    tableText: '#333',
    badgeBg: '#f5f5f5',
  };

  // Sample data for upload reports table
  const uploadReportsData = [
    {
      id: 1,
      dtn: 1234567890,
      estCat: 'Pharmacy',
      ltoComp: 'ABC Pharmaceutical Inc.',
      ltoAdd: '123 Main St, Manila',
      eadd: 'abc@pharmacy.com',
      tin: '123-456-789-000',
      contactNo: '+63 917 123 4567',
      ltoNo: 'LTO-2024-001',
      validity: '2025-12-31',
      prodBrName: 'Paracetamol Plus',
      prodGenName: 'Paracetamol',
      prodDosStr: '500mg',
      prodDosForm: 'Tablet',
      prodClassPrescript: 'OTC',
      prodEssDrugList: 'Yes',
      prodPharmaCat: 'Analgesic'
    },
    {
      id: 2,
      dtn: 9876543210,
      estCat: 'Hospital',
      ltoComp: 'XYZ Medical Center',
      ltoAdd: '456 Health Ave, Quezon City',
      eadd: 'info@xyzmedical.com',
      tin: '987-654-321-000',
      contactNo: '+63 918 765 4321',
      ltoNo: 'LTO-2024-002',
      validity: '2026-06-30',
      prodBrName: 'Amoxicillin Pro',
      prodGenName: 'Amoxicillin',
      prodDosStr: '250mg',
      prodDosForm: 'Capsule',
      prodClassPrescript: 'Rx',
      prodEssDrugList: 'Yes',
      prodPharmaCat: 'Antibiotic'
    },
    {
      id: 3,
      dtn: 5555555555,
      estCat: 'Drugstore',
      ltoComp: 'MediQuick Drugstore',
      ltoAdd: '789 Commerce Rd, Makati',
      eadd: 'contact@mediquick.ph',
      tin: '555-555-555-000',
      contactNo: '+63 919 555 5555',
      ltoNo: 'LTO-2024-003',
      validity: '2025-09-15',
      prodBrName: 'VitaBoost Complete',
      prodGenName: 'Multivitamins',
      prodDosStr: '1 tablet',
      prodDosForm: 'Tablet',
      prodClassPrescript: 'OTC',
      prodEssDrugList: 'No',
      prodPharmaCat: 'Dietary Supplement'
    },
  ];

  const tableColumns = [
    { key: 'dtn', label: 'DTN', width: '100px' },
    { key: 'estCat', label: 'Est. Category', width: '120px' },
    { key: 'ltoComp', label: 'LTO Company', width: '180px' },
    { key: 'ltoAdd', label: 'LTO Address', width: '200px' },
    { key: 'eadd', label: 'Email', width: '180px' },
    { key: 'tin', label: 'TIN', width: '130px' },
    { key: 'contactNo', label: 'Contact No.', width: '130px' },
    { key: 'ltoNo', label: 'LTO No.', width: '120px' },
    { key: 'validity', label: 'Validity', width: '100px' },
    { key: 'prodBrName', label: 'Brand Name', width: '150px' },
    { key: 'prodGenName', label: 'Generic Name', width: '120px' },
    { key: 'prodDosStr', label: 'Dosage Str.', width: '100px' },
    { key: 'prodDosForm', label: 'Dosage Form', width: '120px' },
    { key: 'prodClassPrescript', label: 'Prescription', width: '100px' },
    { key: 'prodEssDrugList', label: 'Essential Drug', width: '120px' },
    { key: 'prodPharmaCat', label: 'Pharma Cat.', width: '130px' },
  ];

  const handleSelectAll = () => {
    if (selectedRows.length === uploadReportsData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(uploadReportsData.map(row => row.id));
    }
  };

  const handleSelectRow = (id) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

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
            Upload Reports
          </h1>
          <p style={{
            color: colors.textTertiary,
            fontSize: '0.9rem',
            transition: 'color 0.3s ease'
          }}>
            Manage and review uploaded pharmaceutical reports
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={{
            padding: '0.75rem 1.5rem',
            background: colors.buttonSecondaryBg,
            border: `1px solid ${colors.buttonSecondaryBorder}`,
            borderRadius: '8px',
            color: colors.textPrimary,
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = colors.buttonSecondaryBgHover;
            e.target.style.borderColor = colors.buttonSecondaryBorderHover;
          }}
          onMouseLeave={(e) => {
            e.target.style.background = colors.buttonSecondaryBg;
            e.target.style.borderColor = colors.buttonSecondaryBorder;
          }}>
            <span>📥</span>
            Export Data
          </button>
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
            Upload New Report
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {[
          { icon: '📋', label: 'Total Reports', value: '3', color: '#3b82f6' },
          { icon: '✅', label: 'Approved', value: '2', color: '#10b981' },
          { icon: '⏳', label: 'Pending', value: '1', color: '#f59e0b' },
          { icon: '❌', label: 'Rejected', value: '0', color: '#ef4444' },
        ].map((stat, index) => (
          <div key={index} style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: '12px',
            padding: '1.25rem',
            transition: 'all 0.3s ease'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.75rem'
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
              transition: 'color 0.3s ease'
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
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
                onChange={(e) => setSearchTerm(e.target.value)}
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

      {/* Data Table */}
      <div style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}>
        {/* Table Header */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: `1px solid ${colors.tableBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: colors.textPrimary,
              transition: 'color 0.3s ease'
            }}>
              Reports Data
            </h3>
            <span style={{
              padding: '0.25rem 0.75rem',
              background: colors.badgeBg,
              borderRadius: '12px',
              fontSize: '0.8rem',
              color: colors.textTertiary,
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}>
              {uploadReportsData.length} records
            </span>
          </div>
          {selectedRows.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: colors.badgeBg,
              borderRadius: '8px',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ color: '#4CAF50', fontSize: '0.85rem', fontWeight: '600' }}>
                {selectedRows.length} selected
              </span>
              <button style={{
                padding: '0.4rem 0.8rem',
                background: '#ef4444',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Table Container with Horizontal Scroll */}
        <div style={{
          overflowX: 'auto',
          maxHeight: '600px',
          overflowY: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '2000px'
          }}>
            <thead style={{
              position: 'sticky',
              top: 0,
              background: colors.tableBg,
              zIndex: 10
            }}>
              <tr>
                <th style={{
                  padding: '1rem',
                  textAlign: 'left',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: colors.textTertiary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: `1px solid ${colors.tableBorder}`,
                  width: '50px',
                  position: 'sticky',
                  left: 0,
                  background: colors.tableBg,
                  zIndex: 11,
                  transition: 'all 0.3s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedRows.length === uploadReportsData.length}
                    onChange={handleSelectAll}
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer',
                      accentColor: '#4CAF50'
                    }}
                  />
                </th>
                {tableColumns.map((col) => (
                  <th key={col.key} style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: colors.textTertiary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    minWidth: col.width,
                    whiteSpace: 'nowrap',
                    transition: 'color 0.3s ease'
                  }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uploadReportsData.map((row, index) => (
                <tr key={row.id} style={{
                  background: index % 2 === 0 ? colors.tableRowEven : colors.tableRowOdd,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.tableRowHover}
                onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? colors.tableRowEven : colors.tableRowOdd}>
                  <td style={{
                    padding: '1rem',
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    position: 'sticky',
                    left: 0,
                    background: index % 2 === 0 ? colors.tableRowEven : colors.tableRowOdd,
                    zIndex: 9
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row.id)}
                      onChange={() => handleSelectRow(row.id)}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                        accentColor: '#4CAF50'
                      }}
                    />
                  </td>
                  {tableColumns.map((col) => (
                    <td key={col.key} style={{
                      padding: '1rem',
                      fontSize: '0.85rem',
                      color: colors.tableText,
                      borderBottom: `1px solid ${colors.tableBorder}`,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: col.width,
                      transition: 'color 0.3s ease'
                    }}>
                      {col.key === 'prodClassPrescript' ? (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: row[col.key] === 'Rx' ? '#3b82f620' : '#10b98120',
                          color: row[col.key] === 'Rx' ? '#3b82f6' : '#10b981',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          {row[col.key]}
                        </span>
                      ) : col.key === 'prodEssDrugList' ? (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: row[col.key] === 'Yes' ? '#10b98120' : '#66666620',
                          color: row[col.key] === 'Yes' ? '#10b981' : '#666',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          {row[col.key]}
                        </span>
                      ) : (
                        row[col.key]
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer - Pagination */}
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
            <select style={{
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
              <option>10</option>
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
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
              1-3 of 3
            </span>
            <div style={{
              display: 'flex',
              gap: '0.5rem'
            }}>
              <button style={{
                width: '32px',
                height: '32px',
                background: colors.buttonSecondaryBg,
                border: `1px solid ${colors.buttonSecondaryBorder}`,
                borderRadius: '6px',
                color: colors.textTertiary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                transition: 'all 0.3s ease'
              }}>
                ‹
              </button>
              <button style={{
                width: '32px',
                height: '32px',
                background: colors.buttonSecondaryBg,
                border: `1px solid ${colors.buttonSecondaryBorder}`,
                borderRadius: '6px',
                color: colors.textTertiary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                transition: 'all 0.3s ease'
              }}>
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadReportsPage;