import React from 'react';
import { useAppStore } from '../../store/appStore';
import MessageList from './MessageList';
import InputArea from './InputArea';

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#666',
    gap: '16px',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#888',
  },
  emptyText: {
    fontSize: '15px',
    maxWidth: '400px',
    textAlign: 'center',
    lineHeight: '1.6',
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
};

function MainWindow() {
  const { activeSessionId, contextTruncated } = useAppStore();

  if (!activeSessionId) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>EDOS</div>
          <div style={styles.emptyText}>
            Select an inquiry from the left panel, or start a new one to begin.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {contextTruncated && (
        <div style={styles.contextWarning}>
          <span>⚠</span>
          <span>Context truncated due to length. Oldest messages may not be visible to the model.</span>
        </div>
      )}
      <MessageList />
      <InputArea />
    </div>
  );
}

export default MainWindow;
