import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { exportSessionPdf } from '../../services/api';
import MessageList from './MessageList';
import InputArea from './InputArea';
import RelatedSessions from './RelatedSessions';

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  welcome: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#666',
    gap: '12px',
    padding: '20px',
  },
  welcomeTitle: {
    fontSize: '28px',
    fontWeight: 600,
    color: '#a5b4fc',
  },
  welcomeSubtitle: {
    fontSize: '16px',
    color: '#888',
    maxWidth: '400px',
    textAlign: 'center',
    lineHeight: '1.6',
  },
  welcomeHint: {
    fontSize: '13px',
    color: '#555',
    marginTop: '8px',
  },
  contextWarning: {
    padding: '8px 20px',
    background: '#422006',
    borderBottom: '1px solid #854d0e',
    color: '#fbbf24',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '8px 16px',
    borderBottom: '1px solid #333',
    background: '#1a1a1a',
  },
  exportButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: '4px',
    color: '#ccc',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  exportButtonHover: {
    background: '#333',
    borderColor: '#555',
    color: '#fff',
  },
  exportButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  contextBar: {
    padding: '8px 16px',
    background: '#1a1a2e',
    borderBottom: '1px solid #2a2a4a',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
  },
  contextLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginRight: '4px',
  },
  contextItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
  },
  contextItemFile: {
    background: '#1e3a5f',
    color: '#93c5fd',
  },
  contextItemAssembled: {
    background: '#3b1f5e',
    color: '#c4b5fd',
  },
};

function MainWindow() {
  const { activeSessionId, contextTruncated, messages, documents } = useAppStore();
  const [exporting, setExporting] = useState(false);
  const [exportHover, setExportHover] = useState(false);

  const handleExport = async () => {
    if (exporting || !activeSessionId) return;

    setExporting(true);
    try {
      await exportSessionPdf(activeSessionId);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export PDF: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const hasMessages = messages && messages.length > 0;

  // Welcome state - no active session but show input
  if (!activeSessionId) {
    return (
      <div style={styles.container}>
        <div style={styles.welcome}>
          <div style={styles.welcomeTitle}>EDOS</div>
          <div style={styles.welcomeSubtitle}>
            Your persistent inquiry environment. Start a conversation to begin exploring.
          </div>
          <div style={styles.welcomeHint}>
            Type below to start a new inquiry
          </div>
        </div>
        <InputArea />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <button
          style={{
            ...styles.exportButton,
            ...(exportHover && !exporting && hasMessages ? styles.exportButtonHover : {}),
            ...(!hasMessages || exporting ? styles.exportButtonDisabled : {}),
          }}
          onClick={handleExport}
          onMouseEnter={() => setExportHover(true)}
          onMouseLeave={() => setExportHover(false)}
          disabled={!hasMessages || exporting}
          title={!hasMessages ? 'No messages to export' : 'Export inquiry to PDF'}
        >
          <span>{exporting ? 'Exporting...' : 'Export PDF'}</span>
        </button>
      </div>
      {contextTruncated && (
        <div style={styles.contextWarning}>
          <span>⚠</span>
          <span>Context truncated due to length. Oldest messages may not be visible to the model.</span>
        </div>
      )}
      {documents && documents.length > 0 && (
        <div style={styles.contextBar}>
          <span style={styles.contextLabel}>Context:</span>
          {documents.map((doc) => (
            <span
              key={doc.id}
              style={{
                ...styles.contextItem,
                ...(doc.type === 'assembled_sessions' ? styles.contextItemAssembled : styles.contextItemFile),
              }}
              title={doc.name}
            >
              {doc.type === 'assembled_sessions' ? '○' : '◇'} {doc.name.length > 30 ? doc.name.slice(0, 30) + '...' : doc.name}
            </span>
          ))}
        </div>
      )}
      <RelatedSessions />
      <MessageList />
      <InputArea />
    </div>
  );
}

export default MainWindow;
