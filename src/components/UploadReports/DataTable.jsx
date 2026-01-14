import { useState } from 'react';
import { tableColumns } from './tableColumns';
import TablePagination from './TablePagination';

function DataTable({
  data,
  selectedRows,
  onSelectRow,
  onSelectAll,
  currentPage,
  rowsPerPage,
  totalRecords,
  totalPages,
  onPageChange,
  onRowsPerPageChange,
  colors
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedRowDetails, setSelectedRowDetails] = useState(null);
  const indexOfFirstRow = (currentPage - 1) * rowsPerPage + 1;
  const indexOfLastRow = Math.min(currentPage * rowsPerPage, totalRecords);

  const handleMenuToggle = (rowId) => {
    setOpenMenuId(openMenuId === rowId ? null : rowId);
  };

  const handleViewDetails = (row) => {
    setOpenMenuId(null);
    setSelectedRowDetails(row);
  };

  const handleCloseModal = () => {
    setSelectedRowDetails(null);
  };

  const renderAppStatusBadge = (status) => {
    const statusUpper = status?.toUpperCase();
    
    if (statusUpper === 'COMPLETED') {
      return (
        <span style={{
          padding: '0.4rem 0.9rem',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#fff',
          borderRadius: '8px',
          fontSize: '0.75rem',
          fontWeight: '700',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <span style={{ fontSize: '0.9rem' }}>✓</span>
          Completed
        </span>
      );
    } else if (statusUpper === 'TO_DO') {
      return (
        <span style={{
          padding: '0.4rem 0.9rem',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: '#fff',
          borderRadius: '8px',
          fontSize: '0.75rem',
          fontWeight: '700',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <span style={{ fontSize: '0.9rem' }}>⏳</span>
          To Do
        </span>
      );
    }
    
    return status;
  };

  // Detail sections configuration
  const detailSections = [
    {
      title: '🏢 Establishment Information',
      icon: '🏢',
      fields: [
        { key: 'dtn', label: 'DTN' },
        { key: 'estCat', label: 'Establishment Category' },
        { key: 'ltoComp', label: 'LTO Company' },
        { key: 'ltoAdd', label: 'LTO Address' },
        { key: 'eadd', label: 'Email Address' },
        { key: 'tin', label: 'TIN' },
        { key: 'contactNo', label: 'Contact Number' },
        { key: 'ltoNo', label: 'LTO Number' },
        { key: 'validity', label: 'Validity' }
      ]
    },
    {
      title: '💊 Product Information',
      icon: '💊',
      fields: [
        { key: 'prodBrName', label: 'Brand Name' },
        { key: 'prodGenName', label: 'Generic Name' },
        { key: 'prodDosStr', label: 'Dosage Strength' },
        { key: 'prodDosForm', label: 'Dosage Form' },
        { key: 'prodClassPrescript', label: 'Prescription Class' },
        { key: 'prodEssDrugList', label: 'Essential Drug List' },
        { key: 'prodPharmaCat', label: 'Pharmaceutical Category' }
      ]
    },
    {
      title: '🏭 Manufacturer Information',
      icon: '🏭',
      fields: [
        { key: 'prodManu', label: 'Manufacturer' },
        { key: 'prodManuAdd', label: 'Manufacturer Address' },
        { key: 'prodManuTin', label: 'Manufacturer TIN' },
        { key: 'prodManuLtoNo', label: 'Manufacturer LTO No.' },
        { key: 'prodManuCountry', label: 'Manufacturer Country' }
      ]
    },
    {
      title: '🚢 Trader Information',
      icon: '🚢',
      fields: [
        { key: 'prodTrader', label: 'Trader' },
        { key: 'prodTraderAdd', label: 'Trader Address' },
        { key: 'prodTraderTin', label: 'Trader TIN' },
        { key: 'prodTraderLtoNo', label: 'Trader LTO No.' },
        { key: 'prodTraderCountry', label: 'Trader Country' }
      ]
    },
    {
      title: '📦 Repacker Information',
      icon: '📦',
      fields: [
        { key: 'prodRepacker', label: 'Repacker' },
        { key: 'prodRepackerAdd', label: 'Repacker Address' },
        { key: 'prodRepackerTin', label: 'Repacker TIN' },
        { key: 'prodRepackerLtoNo', label: 'Repacker LTO No.' },
        { key: 'prodRepackerCountry', label: 'Repacker Country' }
      ]
    },
    {
      title: '📥 Importer Information',
      icon: '📥',
      fields: [
        { key: 'prodImporter', label: 'Importer' },
        { key: 'prodImporterAdd', label: 'Importer Address' },
        { key: 'prodImporterTin', label: 'Importer TIN' },
        { key: 'prodImporterLtoNo', label: 'Importer LTO No.' },
        { key: 'prodImporterCountry', label: 'Importer Country' }
      ]
    },
    {
      title: '🚚 Distributor Information',
      icon: '🚚',
      fields: [
        { key: 'prodDistri', label: 'Distributor' },
        { key: 'prodDistriAdd', label: 'Distributor Address' },
        { key: 'prodDistriTin', label: 'Distributor TIN' },
        { key: 'prodDistriLtoNo', label: 'Distributor LTO No.' },
        { key: 'prodDistriCountry', label: 'Distributor Country' },
        { key: 'prodDistriShelfLife', label: 'Shelf Life' }
      ]
    },
    {
      title: '📋 Product Details',
      icon: '📋',
      fields: [
        { key: 'storageCond', label: 'Storage Condition' },
        { key: 'packaging', label: 'Packaging' },
        { key: 'suggRp', label: 'Suggested RP' },
        { key: 'noSample', label: 'Number of Samples' },
        { key: 'expiryDate', label: 'Expiry Date' },
        { key: 'cprValidity', label: 'CPR Validity' }
      ]
    },
    {
      title: '📑 Application Information',
      icon: '📑',
      fields: [
        { key: 'regNo', label: 'Registration Number' },
        { key: 'appType', label: 'Application Type' },
        { key: 'motherAppType', label: 'Mother App Type' },
        { key: 'oldRsn', label: 'Old RSN' },
        { key: 'ammend1', label: 'Amendment 1' },
        { key: 'ammend2', label: 'Amendment 2' },
        { key: 'ammend3', label: 'Amendment 3' },
        { key: 'prodCat', label: 'Product Category' }
      ]
    },
    {
      title: '💰 Financial Information',
      icon: '💰',
      fields: [
        { key: 'certification', label: 'Certification' },
        { key: 'fee', label: 'Fee' },
        { key: 'lrf', label: 'LRF' },
        { key: 'surc', label: 'SURC' },
        { key: 'total', label: 'Total' },
        { key: 'orNo', label: 'OR Number' }
      ]
    },
    {
      title: '📅 Important Dates',
      icon: '📅',
      fields: [
        { key: 'dateIssued', label: 'Date Issued' },
        { key: 'dateReceivedFdac', label: 'Date Received FDAC' },
        { key: 'dateReceivedCent', label: 'Date Received Central' },
        { key: 'deckingSched', label: 'Decking Schedule' },
        { key: 'dateDeck', label: 'Date Deck' },
        { key: 'dateRemarks', label: 'Date Remarks' },
        { key: 'dateReleased', label: 'Date Released' },
        { key: 'dateExcelUpload', label: 'Date Uploaded' }
      ]
    },
    {
      title: '📄 SECPA Information',
      icon: '📄',
      fields: [
        { key: 'secpa', label: 'SECPA' },
        { key: 'secpaExpDate', label: 'SECPA Expiry Date' },
        { key: 'secpaIssuedOn', label: 'SECPA Issued On' }
      ]
    },
    {
      title: '✅ Evaluation & Status',
      icon: '✅',
      fields: [
        { key: 'eval', label: 'Evaluation' },
        { key: 'appStatus', label: 'Application Status' },
        { key: 'class', label: 'Class' },
        { key: 'typeDocReleased', label: 'Type Document Released' },
        { key: 'attaReleased', label: 'Attachment Released' }
      ]
    },
    {
      title: '📝 Remarks & Conditions',
      icon: '📝',
      fields: [
        { key: 'remarks1', label: 'Remarks 1' },
        { key: 'appRemarks', label: 'Application Remarks' },
        { key: 'cprCond', label: 'CPR Condition' },
        { key: 'cprCondRemarks', label: 'CPR Condition Remarks' },
        { key: 'cprCondAddRemarks', label: 'CPR Condition Additional Remarks' }
      ]
    },
    {
      title: '👤 System Information',
      icon: '👤',
      fields: [
        { key: 'mo', label: 'MO' },
        { key: 'file', label: 'File' },
        { key: 'userUploader', label: 'Uploaded By' }
      ]
    }
  ];

  return (
    <>
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
              {totalRecords} total records
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

        {/* Table Container */}
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
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={onSelectAll}
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
                    transition: 'color 0.3s ease',
                    ...(col.frozen && {
                      position: 'sticky',
                      left: '50px',
                      background: colors.tableBg,
                      zIndex: 11,
                      boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
                    })
                  }}>
                    {col.label}
                  </th>
                ))}
                {/* Actions Column Header */}
                <th style={{
                  padding: '1rem',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: colors.textTertiary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: `1px solid ${colors.tableBorder}`,
                  width: '80px',
                  whiteSpace: 'nowrap',
                  position: 'sticky',
                  right: 0,
                  background: colors.tableBg,
                  zIndex: 11,
                  boxShadow: '-2px 0 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease'
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
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
                      onChange={() => onSelectRow(row.id)}
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
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      minWidth: col.width,
                      transition: 'color 0.3s ease',
                      ...(col.frozen && {
                        position: 'sticky',
                        left: '50px',
                        background: index % 2 === 0 ? colors.tableRowEven : colors.tableRowOdd,
                        zIndex: 9,
                        fontWeight: '600',
                        boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
                      })
                    }}>
                      {col.key === 'appStatus' ? (
                        renderAppStatusBadge(row[col.key])
                      ) : col.key === 'prodClassPrescript' ? (
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
                  {/* Actions Column */}
                  <td style={{
                    padding: '1rem',
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    textAlign: 'center',
                    position: 'sticky',
                    right: 0,
                    background: index % 2 === 0 ? colors.tableRowEven : colors.tableRowOdd,
                    zIndex: 9,
                    boxShadow: '-2px 0 4px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <button
                        onClick={() => handleMenuToggle(row.id)}
                        style={{
                          padding: '0.5rem',
                          background: 'transparent',
                          border: `1px solid ${colors.cardBorder}`,
                          borderRadius: '6px',
                          color: colors.textPrimary,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          width: '32px',
                          height: '32px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = colors.badgeBg;
                          e.currentTarget.style.borderColor = '#4CAF50';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = colors.cardBorder;
                        }}
                      >
                        ⋮
                      </button>
                      
                      {/* Dropdown Menu */}
                      {openMenuId === row.id && (
                        <>
                          <div
                            onClick={() => setOpenMenuId(null)}
                            style={{
                              position: 'fixed',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              zIndex: 999
                            }}
                          />
                          
                          <div style={{
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            marginTop: '0.25rem',
                            background: colors.cardBg,
                            border: `1px solid ${colors.cardBorder}`,
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            minWidth: '160px',
                            zIndex: 1000,
                            overflow: 'hidden'
                          }}>
                            <button
                              onClick={() => handleViewDetails(row)}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                background: 'transparent',
                                border: 'none',
                                color: colors.textPrimary,
                                fontSize: '0.85rem',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = colors.tableRowHover}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <span>👁️</span>
                              <span>View Details</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                alert(`Edit functionality for DTN: ${row.dtn}`);
                              }}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                background: 'transparent',
                                border: 'none',
                                borderTop: `1px solid ${colors.tableBorder}`,
                                color: colors.textPrimary,
                                fontSize: '0.85rem',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = colors.tableRowHover}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <span>✏️</span>
                              <span>Edit</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                if (confirm(`Delete record for DTN: ${row.dtn}?`)) {
                                  alert('Delete functionality not yet implemented');
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                background: 'transparent',
                                border: 'none',
                                borderTop: `1px solid ${colors.tableBorder}`,
                                color: '#ef4444',
                                fontSize: '0.85rem',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#ef444410';
                              }}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <span>🗑️</span>
                              <span>Delete</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          totalRecords={totalRecords}
          totalPages={totalPages}
          indexOfFirstRow={indexOfFirstRow}
          indexOfLastRow={indexOfLastRow}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
          colors={colors}
        />
      </div>

      {/* Sliding Detail Modal */}
      {selectedRowDetails && (
        <>
          {/* Backdrop */}
          <div
            onClick={handleCloseModal}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
              animation: 'fadeIn 0.3s ease',
              backdropFilter: 'blur(2px)'
            }}
          />

          {/* Sliding Panel */}
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '50vw',
            maxWidth: '50vw',
            minWidth: '520px',
            background: `linear-gradient(180deg, ${colors.cardBg} 0%, ${colors.tableBg} 100%)`,
            boxShadow: '-8px 0 40px rgba(0,0,0,0.25)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInRight 0.35s cubic-bezier(.4,0,.2,1)',
            overflow: 'hidden',
            borderLeft: `1px solid ${colors.cardBorder}`
            }}>


            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: `2px solid ${colors.cardBorder}`,
              background: colors.tableBg,
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem'
              }}>
                <div>
                  <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: colors.textPrimary,
                    marginBottom: '0.5rem'
                  }}>
                    Report Details
                  </h2>
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{
                      padding: '0.4rem 0.8rem',
                      background: '#4CAF5020',
                      color: '#4CAF50',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                                          }}>
                      DTN: {selectedRowDetails.dtn}
                    </span>
                    {selectedRowDetails.appStatus && (
                      <span style={{
                        padding: '0.4rem 0.8rem',
                        background: selectedRowDetails.appStatus.toUpperCase() === 'COMPLETED' ? '#10b98120' : '#f59e0b20',
                        color: selectedRowDetails.appStatus.toUpperCase() === 'COMPLETED' ? '#10b981' : '#f59e0b',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        {selectedRowDetails.appStatus}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  style={{
                    padding: '0.5rem',
                    background: 'transparent',
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: '6px',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ef444410';
                    e.currentTarget.style.borderColor = '#ef4444';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = colors.cardBorder;
                    e.currentTarget.style.color = colors.textPrimary;
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{
              flex: 1,
              padding: '1.5rem',
              overflowY: 'auto'
            }}>
              {detailSections.map((section, idx) => {
                // Check if section has any values
                const hasValues = section.fields.some(field => 
                  selectedRowDetails[field.key] && selectedRowDetails[field.key] !== ''
                );
                
                if (!hasValues) return null;

                return (
                  <div key={idx} style={{
                    marginBottom: '2rem',
                    background: colors.tableRowEven,
                    borderRadius: '12px',
                    padding: '1.5rem',
                    border: `1px solid ${colors.cardBorder}`
                  }}>
                    <h3 style={{
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      color: colors.textPrimary,
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      paddingBottom: '0.75rem',
                      borderBottom: `2px solid ${colors.cardBorder}`
                    }}>
                      <span style={{ fontSize: '1.3rem' }}>{section.icon}</span>
                      {section.title.replace(/^[^ ]+ /, '')}
                    </h3>
                    <div style={{
                      display: 'grid',
                      gap: '1rem'
                    }}>
                      {section.fields.map(field => {
                        const value = selectedRowDetails[field.key];
                        if (!value || value === '') return null;

                        return (
                          <div key={field.key} style={{
                            display: 'grid',
                            gridTemplateColumns: '140px 1fr',
                            gap: '1rem',
                            alignItems: 'start'
                          }}>
                            <div style={{
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              color: colors.textTertiary,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              {field.label}:
                            </div>
                            <div style={{
                              fontSize: '0.95rem',
                              color: colors.textPrimary,
                              fontWeight: '500',
                              wordBreak: 'break-word'
                            }}>
                              {field.key === 'appStatus' ? renderAppStatusBadge(value) : value}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.5rem',
              borderTop: `2px solid ${colors.cardBorder}`,
              background: colors.tableBg,
              display: 'flex',
              gap: '1rem',
              position: 'sticky',
              bottom: 0
            }}>
              <button
                onClick={() => {
                  alert('Edit functionality');
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  background: '#4CAF50',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#45a049'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#4CAF50'}
              >
                <span>✏️</span>
                Edit Record
              </button>
              <button
                onClick={handleCloseModal}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  background: colors.buttonSecondaryBg,
                  border: `1px solid ${colors.buttonSecondaryBorder}`,
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.badgeBg}
                onMouseLeave={(e) => e.currentTarget.style.background = colors.buttonSecondaryBg}
              >
                Close
              </button>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideInRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>
        </>
      )}
    </>
  );
}

export default DataTable;