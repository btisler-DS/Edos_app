import React, { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import LeftPanel from './components/LeftPanel/LeftPanel';
import MainWindow from './components/MainWindow/MainWindow';
import ModelProfileIndicator from './components/ModelProfileIndicator';

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid #2a2a4a',
    background: '#16162a',
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
  const { initialize, error, clearError, isLoading } = useAppStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

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
          <span style={styles.title}>EDOS</span>
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
    </div>
  );
}

export default App;
