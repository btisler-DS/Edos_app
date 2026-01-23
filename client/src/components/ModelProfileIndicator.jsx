import React from 'react';
import { useAppStore } from '../store/appStore';

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    background: '#2a2a4a',
    borderRadius: '6px',
    fontSize: '13px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#4ade80',
  },
  name: {
    color: '#ccc',
  },
  model: {
    color: '#888',
    fontSize: '12px',
  },
};

function ModelProfileIndicator() {
  const { activeProfile } = useAppStore();

  if (!activeProfile) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.dot, background: '#f59e0b' }} />
        <span style={styles.name}>No profile active</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.dot} />
      <span style={styles.name}>{activeProfile.name}</span>
      <span style={styles.model}>({activeProfile.model_id})</span>
    </div>
  );
}

export default ModelProfileIndicator;
