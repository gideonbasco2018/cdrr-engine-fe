import { useState, useEffect } from 'react';
import { getUploadReports, uploadExcelFile, downloadTemplate } from '../api/uploadReports';
import StatsCard from '/src/components/UploadReports/StatsCard.jsx';
import FilterBar from '/src/components/UploadReports/FilterBar';
import UploadButton from '/src/components/UploadReports/UploadButton';
import UploadProgress from '/src/components/UploadReports/UploadProgress';
import DataTable from '/src/components/UploadReports/DataTable';
import { mapDataItem, getColorScheme } from '/src/components/UploadReports/utils';

function UploadReportsPage({ darkMode }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [uploadReportsData, setUploadReportsData] = useState([]);
  const [allData, setAllData] = useState([]); // Store all data for filtering
  const [statsData, setStatsData] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    notDecked: 0,
    partiallyDecked: 0,
    decked: 0
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  
  // NEW: Active tab state
  const [activeTab, setActiveTab] = useState('all');

  const colors = getColorScheme(darkMode);

  // Fetch statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const firstBatch = await getUploadReports({
          page: 1,
          pageSize: 100,
          search: '',
          sortBy: '',
          sortOrder: 'desc',
        });

        if (!firstBatch || !firstBatch.data) return;

        const mappedData = firstBatch.data.map(mapDataItem);
        
        // Count Not Decked: BOTH EVALUATION AND DATE DECK are empty
        const notDeckedCount = mappedData.filter(item => 
          (!item.eval || item.eval === '') && (!item.dateDeck || item.dateDeck === '')
        ).length;
        
        // Count Partially Decked: ONE has value, ONE is empty
        const partiallyDeckedCount = mappedData.filter(item => {
          const hasEval = item.eval && item.eval !== '';
          const hasDateDeck = item.dateDeck && item.dateDeck !== '';
          return (hasEval && !hasDateDeck) || (!hasEval && hasDateDeck);
        }).length;
        
        // Count Decked: Both EVALUATION AND DATE DECK have values
        const deckedCount = mappedData.filter(item => 
          (item.eval && item.eval !== '') && (item.dateDeck && item.dateDeck !== '')
        ).length;
        
        setStatsData({
          total: firstBatch.total || 0,
          approved: mappedData.filter(item => 
            item.typeDocReleased && item.typeDocReleased.toUpperCase().includes('CPR')
          ).length,
          pending: mappedData.filter(item => 
            item.appStatus && item.appStatus.toUpperCase() === 'TO_DO'
          ).length,
          rejected: mappedData.filter(item => 
            item.typeDocReleased && item.typeDocReleased.toUpperCase().includes('LOD')
          ).length,
          notDecked: notDeckedCount,
          partiallyDecked: partiallyDeckedCount,
          decked: deckedCount
        });
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };

    fetchStats();
  }, []);

  // Fetch paginated data
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);

        const json = await getUploadReports({
          page: currentPage,
          pageSize: rowsPerPage,
          search: searchTerm,
          sortBy: '',
          sortOrder: 'desc',
        });

        if (!json || !json.data || !Array.isArray(json.data)) {
          setUploadReportsData([]);
          setAllData([]);
          return;
        }

        const mappedData = json.data.map(mapDataItem);
        setAllData(mappedData);
        
        // Apply tab filter
        const filteredData = filterDataByTab(mappedData, activeTab);
        setUploadReportsData(filteredData);
        setTotalRecords(filteredData.length);
        setTotalPages(Math.ceil(filteredData.length / rowsPerPage));
      } catch (err) {
        console.error('Failed to fetch reports', err);
        setUploadReportsData([]);
        setAllData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [currentPage, rowsPerPage, searchTerm, activeTab]);

  // Filter data based on active tab
  const filterDataByTab = (data, tab) => {
    if (tab === 'not-decked') {
      // Not Decked: BOTH EVALUATION and DATE DECK must be empty
      return data.filter(item => 
        (!item.eval || item.eval === '') && (!item.dateDeck || item.dateDeck === '')
      );
    } else if (tab === 'decked') {
      // Decked: Both EVALUATION and DATE DECK must have values
      return data.filter(item => 
        (item.eval && item.eval !== '') && (item.dateDeck && item.dateDeck !== '')
      );
    }
    return data; // 'all' tab
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress('Uploading and processing file...');

      const username = localStorage.getItem('username') || 'system';
      const result = await uploadExcelFile(file, username);

      setUploadProgress(null);
      setUploading(false);

      // Show detailed results
      const { success, errors, duplicates_skipped, total_processed } = result.stats;
      
      let message = `✅ Upload Complete!\n\n`;
      message += `📊 Processed: ${total_processed} rows\n`;
      message += `✓ Inserted: ${success} new records\n`;
      
      if (duplicates_skipped > 0) {
        message += `⊘ Skipped: ${duplicates_skipped} duplicates\n`;
      }
      
      if (errors > 0) {
        message += `✗ Errors: ${errors} failed\n`;
      }

      alert(message);

      // Refresh data without page reload
      setCurrentPage(1);
      
      try {
        const freshData = await getUploadReports({
          page: 1,
          pageSize: rowsPerPage,
          search: searchTerm,
          sortBy: '',
          sortOrder: 'desc',
        });

        if (freshData && freshData.data) {
          const mappedData = freshData.data.map(mapDataItem);
          
          setAllData(mappedData);
          const filteredData = filterDataByTab(mappedData, activeTab);
          setUploadReportsData(filteredData);
          setTotalRecords(filteredData.length);
          setTotalPages(Math.ceil(filteredData.length / rowsPerPage));

          // Update stats
          const notDeckedCount = mappedData.filter(item => 
            (!item.eval || item.eval === '') && (!item.dateDeck || item.dateDeck === '')
          ).length;
          
          const partiallyDeckedCount = mappedData.filter(item => {
            const hasEval = item.eval && item.eval !== '';
            const hasDateDeck = item.dateDeck && item.dateDeck !== '';
            return (hasEval && !hasDateDeck) || (!hasEval && hasDateDeck);
          }).length;
          
          const deckedCount = mappedData.filter(item => 
            (item.eval && item.eval !== '') && (item.dateDeck && item.dateDeck !== '')
          ).length;

          setStatsData({
            total: freshData.total || 0,
            approved: mappedData.filter(item => 
              item.typeDocReleased && item.typeDocReleased.toUpperCase().includes('CPR')
            ).length,
            pending: mappedData.filter(item => 
              item.appStatus && item.appStatus.toUpperCase() === 'TO_DO'
            ).length,
            rejected: mappedData.filter(item => 
              item.typeDocReleased && item.typeDocReleased.toUpperCase().includes('LOD')
            ).length,
            notDecked: notDeckedCount,
            partiallyDecked: partiallyDeckedCount,
            decked: deckedCount
          });
        }
      } catch (refreshError) {
        console.error('Failed to refresh data:', refreshError);
      }

    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(null);
      setUploading(false);
      alert(`❌ Upload failed: ${error.response?.data?.detail || error.message}`);
    }

    event.target.value = '';
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplate();
    } catch (error) {
      console.error('Download template error:', error);
      alert('Failed to download template');
    }
  };

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

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setSelectedRows([]);
    }
  };

  const handleRowsPerPageChange = (e) => {
    const newRowsPerPage = Number(e.target.value);
    const limitedRowsPerPage = Math.min(newRowsPerPage, 100);
    setRowsPerPage(limitedRowsPerPage);
    setCurrentPage(1);
    setSelectedRows([]);
  };

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedRows([]);
    
    // Apply filter immediately
    const filteredData = filterDataByTab(allData, tab);
    setUploadReportsData(filteredData);
    setTotalRecords(filteredData.length);
    setTotalPages(Math.ceil(filteredData.length / rowsPerPage));
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
        <UploadButton
          onFileSelect={handleFileSelect}
          onDownloadTemplate={handleDownloadTemplate}
          uploading={uploading}
          colors={colors}
        />
      </div>

      <StatsCard stats={statsData} colors={colors} />

      {/* TABS SECTION */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        borderBottom: `2px solid ${colors.cardBorder}`,
        paddingBottom: '0',
        transition: 'border-color 0.3s ease'
      }}>
        {[
          { id: 'all', label: 'All Reports', icon: '📋', count: statsData.total },
          { id: 'not-decked', label: 'Not yet Decked', icon: '⏳', count: statsData.notDecked },
          { id: 'partially-decked', label: 'Partially Decked', icon: '📝', count: statsData.partiallyDecked },
          { id: 'decked', label: 'Decked', icon: '✅', count: statsData.decked }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: '0.875rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? `3px solid #4CAF50` : '3px solid transparent',
              color: activeTab === tab.id ? colors.textPrimary : colors.textSecondary,
              fontSize: '0.95rem',
              fontWeight: activeTab === tab.id ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              position: 'relative',
              top: '2px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = colors.textPrimary;
                e.currentTarget.style.borderBottomColor = '#4CAF5050';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = colors.textSecondary;
                e.currentTarget.style.borderBottomColor = 'transparent';
              }
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span>
            <span>{tab.label}</span>
            <span style={{
              padding: '0.2rem 0.6rem',
              background: activeTab === tab.id ? '#4CAF50' : colors.badgeBg,
              color: activeTab === tab.id ? '#fff' : colors.textTertiary,
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '600',
              minWidth: '32px',
              textAlign: 'center',
              transition: 'all 0.2s ease'
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <FilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm} colors={colors} />
      <UploadProgress message={uploadProgress} colors={colors} />

      {loading && (
        <div style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
          color: colors.textSecondary
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Loading reports...
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}

      {!loading && uploadReportsData.length === 0 && (
        <div style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
          color: colors.textSecondary
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            No reports found
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            {activeTab === 'not-decked' && 'Both EVALUATION and DATE DECK are empty'}
            {activeTab === 'partially-decked' && 'Either EVALUATION or DATE DECK is filled (not both)'}
            {activeTab === 'decked' && 'Both EVALUATION and DATE DECK are filled'}
            {activeTab === 'all' && 'Try adjusting your search or upload new reports'}
          </div>
        </div>
      )}

      {!loading && uploadReportsData.length > 0 && (
        <DataTable
          data={uploadReportsData}
          selectedRows={selectedRows}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          totalRecords={totalRecords}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          colors={colors}
        />
      )}
    </div>
  );
}

export default UploadReportsPage;