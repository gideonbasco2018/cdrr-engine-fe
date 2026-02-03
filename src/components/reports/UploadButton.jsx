import { useRef } from 'react';

function UploadButton({ onFileSelect, onDownloadTemplate, uploading, colors }) {
  const fileInputRef = useRef(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={onFileSelect}
      />

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button 
          onClick={onDownloadTemplate}
          style={{
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
          Download Template
        </button>

        <button 
          onClick={handleUploadClick}
          disabled={uploading}
          style={{
            padding: '0.75rem 1.5rem',
            background: uploading ? '#999' : '#4CAF50',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s',
            opacity: uploading ? 0.7 : 1
          }}
          onMouseEnter={(e) => {
            if (!uploading) {
              e.target.style.background = '#45a049';
              e.target.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!uploading) {
              e.target.style.background = '#4CAF50';
              e.target.style.transform = 'translateY(0)';
            }
          }}>
          <span>{uploading ? '⏳' : '📤'}</span>
          {uploading ? 'Uploading...' : 'Upload New Report'}
        </button>
      </div>
    </>
  );
}

export default UploadButton;