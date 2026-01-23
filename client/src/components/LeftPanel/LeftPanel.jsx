import React, { useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { uploadFile } from '../../services/api';
import SessionList from './SessionList';

const styles = {
  panel: {
    width: '300px',
    maxWidth: '80vw',
    minWidth: '300px',
    height: '100%',
    background: '#12122a',
    borderRight: '1px solid #2a2a4a',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.2s ease, min-width 0.2s ease, transform 0.2s ease',
    zIndex: 100,
  },
  panelCollapsed: {
    width: '48px',
    minWidth: '48px',
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid #2a2a4a',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  headerCollapsed: {
    padding: '12px',
    justifyContent: 'center',
  },
  collapseButton: {
    background: 'transparent',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    padding: '4px',
    fontSize: '16px',
    lineHeight: 1,
    borderRadius: '4px',
    transition: 'color 0.15s',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  headerButtons: {
    display: 'flex',
    gap: '8px',
  },
  newButton: {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'background 0.2s',
  },
  uploadButton: {
    background: 'transparent',
    color: '#888',
    border: '1px solid #3a3a5a',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  hiddenInput: {
    display: 'none',
  },
  sortBar: {
    padding: '8px 16px',
    borderBottom: '1px solid #1a1a3a',
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
  },
  sortOption: {
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#666',
    background: 'transparent',
    border: 'none',
    transition: 'all 0.15s',
  },
  sortOptionActive: {
    color: '#ccc',
    background: '#2a2a4a',
  },
  list: {
    flex: 1,
    overflow: 'auto',
  },
};

function LeftPanel() {
  const { createSession, isLoading, sessionSortBy, setSessionSortBy, loadSessions, selectSession, activeSessionId, leftPanelCollapsed, toggleLeftPanel } = useAppStore();
  const fileInputRef = useRef(null);

  const handleNewInquiry = async () => {
    try {
      await createSession();
    } catch (error) {
      // Error is handled in store
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // If there's an active session, add document to it; otherwise create new session
      const result = await uploadFile(file, activeSessionId);
      await loadSessions();

      if (result.isNewSession) {
        // New session created - select it
        selectSession(result.session.id);
      } else {
        // Document added to current session - refresh to get updated context
        selectSession(activeSessionId);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    }

    // Reset input so same file can be uploaded again
    e.target.value = '';
  };

  if (leftPanelCollapsed) {
    return (
      <div style={{ ...styles.panel, ...styles.panelCollapsed }}>
        <div style={{ ...styles.header, ...styles.headerCollapsed }}>
          <button
            style={styles.collapseButton}
            onClick={toggleLeftPanel}
            title="Expand panel"
            onMouseOver={(e) => e.target.style.color = '#ccc'}
            onMouseOut={(e) => e.target.style.color = '#666'}
          >
            »
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <button
          style={styles.collapseButton}
          onClick={toggleLeftPanel}
          title="Collapse panel"
          onMouseOver={(e) => e.target.style.color = '#ccc'}
          onMouseOut={(e) => e.target.style.color = '#666'}
        >
          «
        </button>
        <span style={styles.title}>Inquiries</span>
        <div style={styles.headerButtons}>
          <button
            style={styles.uploadButton}
            onClick={handleUploadClick}
            disabled={isLoading}
            title="Upload PDF, TXT, or MD file"
            onMouseOver={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.color = '#ccc'; }}
            onMouseOut={(e) => { e.target.style.borderColor = '#3a3a5a'; e.target.style.color = '#888'; }}
          >
            Upload
          </button>
          <button
            style={styles.newButton}
            onClick={handleNewInquiry}
            disabled={isLoading}
            onMouseOver={(e) => e.target.style.background = '#4338ca'}
            onMouseOut={(e) => e.target.style.background = '#4f46e5'}
          >
            New
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          onChange={handleFileChange}
          style={styles.hiddenInput}
        />
      </div>
      <div style={styles.sortBar}>
        <button
          style={{
            ...styles.sortOption,
            ...(sessionSortBy === 'last_active' ? styles.sortOptionActive : {}),
          }}
          onClick={() => setSessionSortBy('last_active')}
        >
          Recent
        </button>
        <button
          style={{
            ...styles.sortOption,
            ...(sessionSortBy === 'created' ? styles.sortOptionActive : {}),
          }}
          onClick={() => setSessionSortBy('created')}
        >
          Created
        </button>
      </div>
      <div style={styles.list}>
        <SessionList />
      </div>
    </div>
  );
}

export default LeftPanel;
