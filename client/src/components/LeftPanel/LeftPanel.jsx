import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { uploadFile } from '../../services/api';
import SessionList from './SessionList';
import RetrievePanel from './RetrievePanel';

const MOBILE_BREAKPOINT = 768;

const styles = {
  panel: {
    width: '300px',
    maxWidth: '80vw',
    height: '100%',
    background: '#12122a',
    borderRight: '1px solid #2a2a4a',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease, width 0.2s ease',
    zIndex: 100,
    flexShrink: 0,
  },
  panelMobile: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 200,
    boxShadow: '4px 0 20px rgba(0,0,0,0.5)',
  },
  panelCollapsed: {
    width: '48px',
  },
  panelCollapsedMobile: {
    transform: 'translateX(-100%)',
    width: '300px',
    maxWidth: '80vw',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 150,
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
  filterBar: {
    padding: '8px 16px',
    borderBottom: '1px solid #1a1a3a',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  filterSelect: {
    flex: 1,
    padding: '6px 8px',
    background: '#1a1a3a',
    border: '1px solid #2a2a4a',
    borderRadius: '4px',
    color: '#ccc',
    fontSize: '12px',
    cursor: 'pointer',
    outline: 'none',
  },
  filterCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#888',
    cursor: 'pointer',
  },
  list: {
    flex: 1,
    overflow: 'auto',
  },
  assemblyBar: {
    padding: '8px 16px',
    borderBottom: '1px solid #1a1a3a',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  assembleButton: {
    padding: '6px 12px',
    background: 'transparent',
    border: '1px solid #3a3a5a',
    borderRadius: '4px',
    color: '#888',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  assembleButtonActive: {
    padding: '6px 12px',
    background: '#4f46e5',
    border: '1px solid #4f46e5',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
  },
  composeButton: {
    flex: 1,
    padding: '8px 12px',
    background: '#059669',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  selectionCount: {
    fontSize: '12px',
    color: '#888',
  },
  importButton: {
    background: 'transparent',
    color: '#888',
    border: '1px solid #3a3a5a',
    padding: '6px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  importStatus: {
    padding: '8px 16px',
    background: '#1a2a3a',
    borderBottom: '1px solid #2a3a4a',
    fontSize: '12px',
    color: '#7dd3fc',
  },
  importError: {
    padding: '8px 16px',
    background: '#2a1a1a',
    borderBottom: '1px solid #4a2a2a',
    fontSize: '12px',
    color: '#fca5a5',
  },
  importSuccess: {
    padding: '8px 16px',
    background: '#1a2a1a',
    borderBottom: '1px solid #2a4a2a',
    fontSize: '12px',
    color: '#86efac',
  },
  retrieveButton: {
    padding: '6px 12px',
    background: 'transparent',
    border: '1px solid #3a3a5a',
    borderRadius: '4px',
    color: '#888',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
};

function LeftPanel() {
  const {
    createSession,
    isLoading,
    sessionSortBy,
    setSessionSortBy,
    loadSessions,
    selectSession,
    activeSessionId,
    leftPanelCollapsed,
    toggleLeftPanel,
    projects,
    selectedProjectFilter,
    setProjectFilter,
    filterHasDocuments,
    setFilterHasDocuments,
    contextAssemblyMode,
    setContextAssemblyMode,
    selectedForAssembly,
    composeFromAssembly,
    importStatus,
    importOpenAIBackup,
    clearImportStatus,
    retrieveMode,
    setRetrieveMode,
    showArchived,
    toggleShowArchived,
    createProject,
    renameProject,
    deleteProject,
  } = useAppStore();
  const fileInputRef = useRef(null);
  const importInputRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingProjectName, setEditingProjectName] = useState('');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleProjectFilterChange = (e) => {
    const value = e.target.value;
    setProjectFilter(value === '' ? null : value);
    // Reload sessions with new filter
    setTimeout(() => loadSessions(), 0);
  };

  const handleDocsFilterChange = (e) => {
    setFilterHasDocuments(e.target.checked);
    setTimeout(() => loadSessions(), 0);
  };

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    try {
      await createProject(name);
      setNewProjectName('');
      setShowNewProject(false);
    } catch (err) {
      // error handled in store
    }
  };

  const handleRenameProject = async (projectId) => {
    const name = editingProjectName.trim();
    if (!name) return;
    try {
      await renameProject(projectId, name);
      setEditingProjectId(null);
      setEditingProjectName('');
    } catch (err) {
      // error handled in store
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm('Delete this project? Sessions will be unassigned, not deleted.')) return;
    try {
      await deleteProject(projectId);
    } catch (err) {
      // error handled in store
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await importOpenAIBackup(file);
    } catch (error) {
      console.error('Import failed:', error);
    }

    // Reset input
    e.target.value = '';
  };

  // On mobile when collapsed, hide completely (will show hamburger in header)
  if (leftPanelCollapsed && isMobile) {
    return null;
  }

  // Show RetrievePanel when in retrieve mode
  if (retrieveMode) {
    return <RetrievePanel />;
  }

  // Desktop collapsed state
  if (leftPanelCollapsed && !isMobile) {
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

  const panelStyle = {
    ...styles.panel,
    ...(isMobile ? styles.panelMobile : {}),
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && (
        <div style={styles.overlay} onClick={toggleLeftPanel} />
      )}
      <div style={panelStyle}>
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
            accept=".pdf,.txt,.md,.json"
            onChange={handleFileChange}
            style={styles.hiddenInput}
          />
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            onChange={handleImportChange}
            style={styles.hiddenInput}
          />
        </div>
        {importStatus && (
          <div style={
            importStatus.importing ? styles.importStatus :
            importStatus.result?.error ? styles.importError :
            styles.importSuccess
          }>
            {importStatus.importing ? (
              'Importing conversations...'
            ) : importStatus.result?.error ? (
              <>Error: {importStatus.result.error} <button onClick={clearImportStatus} style={{ marginLeft: 8, cursor: 'pointer' }}>×</button></>
            ) : (
              <>{importStatus.result?.message} <button onClick={clearImportStatus} style={{ marginLeft: 8, cursor: 'pointer' }}>×</button></>
            )}
          </div>
        )}
        <div style={styles.sortBar}>
          <button
            style={{
              ...styles.sortOption,
              ...(!showArchived ? styles.sortOptionActive : {}),
            }}
            onClick={() => { if (showArchived) toggleShowArchived(); }}
          >
            Active
          </button>
          <button
            style={{
              ...styles.sortOption,
              ...(showArchived ? styles.sortOptionActive : {}),
            }}
            onClick={() => { if (!showArchived) toggleShowArchived(); }}
          >
            Archived
          </button>
          <span style={{ borderLeft: '1px solid #2a2a4a', margin: '0 4px' }} />
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
        <div style={styles.filterBar}>
          <select
            style={styles.filterSelect}
            value={selectedProjectFilter || ''}
            onChange={handleProjectFilterChange}
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sessionCount || 0})
              </option>
            ))}
            <option value="unassigned">(No Project)</option>
          </select>
          <button
            style={{ ...styles.sortOption, fontSize: '14px', padding: '2px 8px' }}
            onClick={() => setShowNewProject(!showNewProject)}
            title="New project"
          >
            +
          </button>
          <label style={styles.filterCheckbox}>
            <input
              type="checkbox"
              checked={filterHasDocuments}
              onChange={handleDocsFilterChange}
            />
            Docs
          </label>
        </div>
        {showNewProject && (
          <div style={{ ...styles.filterBar, gap: '6px' }}>
            <input
              style={{ ...styles.filterSelect, flex: 1, padding: '6px 8px' }}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateProject(); if (e.key === 'Escape') setShowNewProject(false); }}
              placeholder="Project name..."
              autoFocus
            />
            <button
              style={{ ...styles.sortOption, color: '#86efac', fontSize: '12px' }}
              onClick={handleCreateProject}
            >
              Create
            </button>
          </div>
        )}
        {selectedProjectFilter && selectedProjectFilter !== 'unassigned' && (
          <div style={{ ...styles.filterBar, gap: '6px', fontSize: '11px' }}>
            {editingProjectId === selectedProjectFilter ? (
              <>
                <input
                  style={{ ...styles.filterSelect, flex: 1, padding: '4px 6px', fontSize: '11px' }}
                  value={editingProjectName}
                  onChange={(e) => setEditingProjectName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRenameProject(selectedProjectFilter); if (e.key === 'Escape') setEditingProjectId(null); }}
                  autoFocus
                />
                <button
                  style={{ ...styles.sortOption, color: '#86efac', fontSize: '11px' }}
                  onClick={() => handleRenameProject(selectedProjectFilter)}
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <button
                  style={{ ...styles.sortOption, fontSize: '11px' }}
                  onClick={() => {
                    const proj = projects.find(p => p.id === selectedProjectFilter);
                    setEditingProjectId(selectedProjectFilter);
                    setEditingProjectName(proj?.name || '');
                  }}
                >
                  Rename
                </button>
                <button
                  style={{ ...styles.sortOption, fontSize: '11px', color: '#f87171' }}
                  onClick={() => handleDeleteProject(selectedProjectFilter)}
                >
                  Delete Project
                </button>
              </>
            )}
          </div>
        )}
        <div style={styles.assemblyBar}>
          <button
            style={contextAssemblyMode ? styles.assembleButtonActive : styles.assembleButton}
            onClick={() => setContextAssemblyMode(!contextAssemblyMode)}
            onMouseOver={(e) => {
              if (!contextAssemblyMode) {
                e.target.style.borderColor = '#4f46e5';
                e.target.style.color = '#ccc';
              }
            }}
            onMouseOut={(e) => {
              if (!contextAssemblyMode) {
                e.target.style.borderColor = '#3a3a5a';
                e.target.style.color = '#888';
              }
            }}
          >
            {contextAssemblyMode ? 'Cancel' : 'Assemble'}
          </button>
          <button
            style={styles.retrieveButton}
            onClick={() => setRetrieveMode(true)}
            title="Search archived conversations"
            onMouseOver={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.color = '#ccc'; }}
            onMouseOut={(e) => { e.target.style.borderColor = '#3a3a5a'; e.target.style.color = '#888'; }}
          >
            Retrieve
          </button>
          <button
            style={styles.importButton}
            onClick={handleImportClick}
            disabled={importStatus?.importing}
            title="Import OpenAI conversations.json backup"
            onMouseOver={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.color = '#ccc'; }}
            onMouseOut={(e) => { e.target.style.borderColor = '#3a3a5a'; e.target.style.color = '#888'; }}
          >
            {importStatus?.importing ? 'Importing...' : 'Import'}
          </button>
          {contextAssemblyMode && selectedForAssembly.length > 0 && (
            <span style={styles.selectionCount}>
              {selectedForAssembly.length} selected
            </span>
          )}
          {contextAssemblyMode && selectedForAssembly.length >= 2 && (
            <button
              style={styles.composeButton}
              onClick={composeFromAssembly}
              onMouseOver={(e) => e.target.style.background = '#047857'}
              onMouseOut={(e) => e.target.style.background = '#059669'}
            >
              Compose New Inquiry
            </button>
          )}
        </div>
        <div style={styles.list}>
          <SessionList />
        </div>
      </div>
    </>
  );
}

export default LeftPanel;
