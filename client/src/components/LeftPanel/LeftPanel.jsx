import React from 'react';
import { useAppStore } from '../../store/appStore';
import SessionList from './SessionList';

const styles = {
  panel: {
    width: '300px',
    minWidth: '300px',
    height: '100%',
    background: '#12122a',
    borderRight: '1px solid #2a2a4a',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid #2a2a4a',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
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
  const { createSession, isLoading, sessionSortBy, setSessionSortBy } = useAppStore();

  const handleNewInquiry = async () => {
    try {
      await createSession();
    } catch (error) {
      // Error is handled in store
    }
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Inquiries</span>
        <button
          style={styles.newButton}
          onClick={handleNewInquiry}
          disabled={isLoading}
          onMouseOver={(e) => e.target.style.background = '#4338ca'}
          onMouseOut={(e) => e.target.style.background = '#4f46e5'}
        >
          New Inquiry
        </button>
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
