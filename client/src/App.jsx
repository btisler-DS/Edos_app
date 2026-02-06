import React, { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import LeftPanel from './components/LeftPanel/LeftPanel';
import MainWindow from './components/MainWindow/MainWindow';
import ModelProfileIndicator from './components/ModelProfileIndicator';
import AssemblyPreviewModal from './components/AssemblyPreviewModal';
import InsightsPanel from './components/InsightsPanel';
import Login from './components/Login';

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
  insightsButton: {
    background: 'transparent',
    border: '1px solid #3a3a5a',
    color: '#888',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    marginRight: '12px',
  },
  insightsModal: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '450px',
    maxWidth: '100vw',
    background: '#12122a',
    borderLeft: '1px solid #2a2a4a',
    zIndex: 1000,
    boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
    animation: 'slideIn 0.2s ease-out',
  },
  insightsOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
  insightsClose: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'transparent',
    border: 'none',
    color: '#888',
    fontSize: '24px',
    cursor: 'pointer',
    zIndex: 1001,
  },
};

function App() {
  const {
    initialize,
    error,
    clearError,
    isLoading,
    leftPanelCollapsed,
    toggleLeftPanel,
    checkAuthStatus,
    isAuthenticated,
    authRequired,
    authLoading,
  } = useAppStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const [showInsights, setShowInsights] = useState(false);

  // Check auth status first
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Initialize app once authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      initialize();
    }
  }, [isAuthenticated, authLoading, initialize]);

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

  // Show loading during auth check
  if (authLoading) {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: '#888' }}>Loading EDOS...</div>
      </div>
    );
  }

  // Show login if auth required and not authenticated
  if (authRequired && !isAuthenticated) {
    return <Login />;
  }

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
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              style={styles.insightsButton}
              onClick={() => setShowInsights(true)}
              onMouseOver={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.color = '#a5b4fc'; }}
              onMouseOut={(e) => { e.target.style.borderColor = '#3a3a5a'; e.target.style.color = '#888'; }}
            >
              Insights
            </button>
            <ModelProfileIndicator />
          </div>
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
      {showInsights && (
        <>
          <style>
            {`
              @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}
          </style>
          <div style={styles.insightsOverlay} onClick={() => setShowInsights(false)} />
          <div style={styles.insightsModal}>
            <button
              style={styles.insightsClose}
              onClick={() => setShowInsights(false)}
            >
              &times;
            </button>
            <InsightsPanel />
          </div>
        </>
      )}
    </div>
  );
}

export default App;
