import React, { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import LeftPanel from './components/LeftPanel/LeftPanel';
import MainWindow from './components/MainWindow/MainWindow';
import ModelProfileIndicator from './components/ModelProfileIndicator';
import AssemblyPreviewModal from './components/AssemblyPreviewModal';

const MOBILE_BREAKPOINT = 768;

const styles = {
  container: {
    display: 'flex',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #2a2a4a',
    background: '#16162a',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  menuButton: {
    background: 'transparent',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    padding: '8px',
    fontSize: '20px',
    lineHeight: 1,
    borderRadius: '4px',
    display: 'none',
  },
  menuButtonMobile: {
    display: 'block',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#fff',
  },
  error: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    background: '#ff4757',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '8px',
    maxWidth: '400px',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  errorClose: {
    background: 'none',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '18px',
  },
};

function App() {
  const { initialize, error, clearError, isLoading, leftPanelCollapsed, toggleLeftPanel } = useAppStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      // Auto-collapse on mobile if not already collapsed
      if (mobile && !leftPanelCollapsed) {
        toggleLeftPanel();
      }
    };

    window.addEventListener('resize', handleResize);
    // Check on mount
    if (isMobile && !leftPanelCollapsed) {
      toggleLeftPanel();
    }
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Run once on mount

  if (isLoading) {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: '#888' }}>Loading EDOS...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <LeftPanel />
      <div style={styles.main}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            {isMobile && leftPanelCollapsed && (
              <button
                style={{ ...styles.menuButton, ...styles.menuButtonMobile }}
                onClick={toggleLeftPanel}
                title="Open menu"
              >
                ☰
              </button>
            )}
            <span style={styles.title}>EDOS</span>
          </div>
          <ModelProfileIndicator />
        </header>
        <MainWindow />
      </div>
      {error && (
        <div style={styles.error}>
          <span>{error}</span>
          <button style={styles.errorClose} onClick={clearError}>×</button>
        </div>
      )}
      <AssemblyPreviewModal />
    </div>
  );
}

export default App;
