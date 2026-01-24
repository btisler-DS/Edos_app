import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import SettingsModal from './SettingsModal';

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    background: '#2a2a4a',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  containerHover: {
    background: '#3a3a5a',
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
  settingsIcon: {
    marginLeft: '4px',
    color: '#666',
    fontSize: '14px',
  },
};

function ModelProfileIndicator() {
  const { activeProfile } = useAppStore();
  const [isHovered, setIsHovered] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleClick = () => {
    setShowSettings(true);
  };

  if (!activeProfile) {
    return (
      <>
        <div
          style={{ ...styles.container, ...(isHovered ? styles.containerHover : {}) }}
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          title="Open settings"
        >
          <div style={{ ...styles.dot, background: '#f59e0b' }} />
          <span style={styles.name}>No profile active</span>
          <span style={styles.settingsIcon}>⚙</span>
        </div>
        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </>
    );
  }

  // Shorten model name for display
  const shortModelName = activeProfile.model_id.split('-').slice(0, 2).join('-');

  return (
    <>
      <div
        style={{ ...styles.container, ...(isHovered ? styles.containerHover : {}) }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Open settings"
      >
        <div style={styles.dot} />
        <span style={styles.name}>{activeProfile.name}</span>
        <span style={styles.model}>({shortModelName})</span>
        <span style={styles.settingsIcon}>⚙</span>
      </div>
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}

export default ModelProfileIndicator;
