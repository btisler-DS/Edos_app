import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/appStore';

const styles = {
  item: {
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #1a1a3a',
    transition: 'background 0.15s',
    position: 'relative',
  },
  itemActive: {
    background: '#2a2a4a',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '4px',
  },
  pinIcon: {
    fontSize: '11px',
    color: '#4f46e5',
    flexShrink: 0,
  },
  title: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#eee',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
    minWidth: 0,
  },
  meta: {
    fontSize: '12px',
    color: '#666',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    display: 'flex',
    gap: '2px',
    opacity: 0,
    transition: 'opacity 0.15s',
    flexShrink: 0,
  },
  actionsVisible: {
    opacity: 1,
  },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    padding: '2px 5px',
    fontSize: '12px',
    borderRadius: '3px',
    lineHeight: 1,
    transition: 'color 0.15s, background 0.15s',
  },
  renameInput: {
    width: '100%',
    padding: '2px 4px',
    background: '#1a1a3a',
    border: '1px solid #4f46e5',
    borderRadius: '3px',
    color: '#eee',
    fontSize: '14px',
    fontWeight: 500,
    outline: 'none',
    marginBottom: '4px',
  },
  preview: {
    position: 'fixed',
    width: '300px',
    background: '#1e1e3a',
    border: '1px solid #3a3a5a',
    borderRadius: '8px',
    padding: '16px',
    zIndex: 1000,
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    pointerEvents: 'none',
  },
  previewTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  previewContent: {
    fontSize: '13px',
    color: '#ccc',
    lineHeight: '1.5',
    marginBottom: '12px',
  },
  previewLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#666',
    marginBottom: '4px',
  },
  itemWithCheckbox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  assemblyCheckbox: {
    marginTop: '4px',
    width: '16px',
    height: '16px',
    accentColor: '#4f46e5',
    cursor: 'pointer',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  projectSelect: {
    padding: '2px 4px',
    background: '#1a1a3a',
    border: '1px solid #3a3a5a',
    borderRadius: '3px',
    color: '#ccc',
    fontSize: '11px',
    cursor: 'pointer',
    outline: 'none',
    maxWidth: '120px',
  },
};

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

const MOBILE_BREAKPOINT = 768;

function SessionItem({ session }) {
  const {
    activeSessionId,
    selectSession,
    leftPanelCollapsed,
    toggleLeftPanel,
    contextAssemblyMode,
    selectedForAssembly,
    toggleSessionForAssembly,
    pinSession,
    unpinSession,
    archiveSession,
    unarchiveSession,
    renameSession,
    deleteSession,
    showArchived,
    projects,
    setSessionProject,
  } = useAppStore();
  const [showPreview, setShowPreview] = useState(false);
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const [hovered, setHovered] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const itemRef = useRef(null);
  const renameInputRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const isActive = activeSessionId === session.id;
  const hasMetadata = session.orientation_blurb || session.unresolved_edge || session.last_pivot;
  const hasPreviewContent = hasMetadata || session.first_assistant_snippet;
  const isPinned = session.pinned === 1;
  const isTitleLocked = session.title_locked === 1;

  // Truncate snippet for display
  const snippetPreview = session.first_assistant_snippet
    ? (session.first_assistant_snippet.length > 150
        ? session.first_assistant_snippet.substring(0, 150) + '...'
        : session.first_assistant_snippet)
    : null;

  const handleMouseEnter = () => {
    setHovered(true);
    // Skip hover preview on mobile (touch devices)
    if (isMobile) return;
    if (itemRef.current && hasPreviewContent) {
      const rect = itemRef.current.getBoundingClientRect();
      setPreviewPos({
        top: Math.max(10, rect.top),
        left: rect.right + 8,
      });
      setShowPreview(true);
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setShowPreview(false);
    setShowProjectMenu(false);
  };

  const handleClick = () => {
    if (isRenaming) return;
    if (contextAssemblyMode) {
      toggleSessionForAssembly(session.id);
    } else {
      selectSession(session.id);
      if (isMobile && !leftPanelCollapsed) {
        toggleLeftPanel();
      }
    }
  };

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    toggleSessionForAssembly(session.id);
  };

  const handlePin = (e) => {
    e.stopPropagation();
    if (isPinned) {
      unpinSession(session.id);
    } else {
      pinSession(session.id);
    }
  };

  const handleRenameStart = (e) => {
    e.stopPropagation();
    if (isTitleLocked) return;
    setRenameValue(session.title || '');
    setIsRenaming(true);
  };

  const handleRenameCommit = async () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== (session.title || '')) {
      try {
        await renameSession(session.id, trimmed);
      } catch (err) {
        // error handled in store
      }
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRenameCommit();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
    }
  };

  const handleArchive = (e) => {
    e.stopPropagation();
    if (showArchived) {
      unarchiveSession(session.id);
    } else {
      archiveSession(session.id);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm('Delete this inquiry permanently?')) {
      deleteSession(session.id);
    }
  };

  const handleProjectToggle = (e) => {
    e.stopPropagation();
    setShowProjectMenu(!showProjectMenu);
  };

  const handleMoveToProject = (e) => {
    e.stopPropagation();
    const projectId = e.target.value;
    setSessionProject(session.id, projectId === '' ? null : projectId);
    setShowProjectMenu(false);
  };

  const isSelectedForAssembly = selectedForAssembly.includes(session.id);

  const previewContent = showPreview && hasPreviewContent && !isMobile && !isRenaming && createPortal(
    <div style={{ ...styles.preview, top: previewPos.top, left: previewPos.left }}>
      {hasMetadata ? (
        <>
          <div style={styles.previewTitle}>Re-entry Context</div>

          {session.orientation_blurb && (
            <>
              <div style={styles.previewLabel}>What this was about</div>
              <div style={styles.previewContent}>{session.orientation_blurb}</div>
            </>
          )}

          {session.unresolved_edge && (
            <>
              <div style={styles.previewLabel}>Unresolved</div>
              <div style={styles.previewContent}>{session.unresolved_edge}</div>
            </>
          )}

          {session.last_pivot && (
            <>
              <div style={styles.previewLabel}>Last pivot</div>
              <div style={styles.previewContent}>{session.last_pivot}</div>
            </>
          )}
        </>
      ) : (
        <>
          <div style={styles.previewTitle}>Preview</div>
          <div style={styles.previewContent}>{snippetPreview}</div>
        </>
      )}
    </div>,
    document.body
  );

  const itemBackground = isSelectedForAssembly
    ? '#2a2a5a'
    : isActive
      ? '#2a2a4a'
      : hovered
        ? '#1a1a3a'
        : 'transparent';

  const actionBarStyle = {
    ...styles.actions,
    ...(hovered && !contextAssemblyMode && !isRenaming ? styles.actionsVisible : {}),
  };

  const titleDisplay = isRenaming ? (
    <input
      ref={renameInputRef}
      style={styles.renameInput}
      value={renameValue}
      onChange={(e) => setRenameValue(e.target.value)}
      onBlur={handleRenameCommit}
      onKeyDown={handleRenameKeyDown}
      onClick={(e) => e.stopPropagation()}
    />
  ) : (
    <div style={styles.titleRow}>
      {isPinned && <span style={styles.pinIcon} title="Pinned">&#x1F4CC;</span>}
      <div style={styles.title}>
        {session.title || 'Untitled Inquiry'}
      </div>
    </div>
  );

  const actionButtons = (
    <div style={actionBarStyle}>
      <button
        style={styles.actionBtn}
        onClick={handlePin}
        title={isPinned ? 'Unpin' : 'Pin'}
        onMouseOver={(e) => { e.target.style.color = '#ccc'; e.target.style.background = '#2a2a4a'; }}
        onMouseOut={(e) => { e.target.style.color = '#666'; e.target.style.background = 'transparent'; }}
      >
        {isPinned ? 'Unpin' : 'Pin'}
      </button>
      {!isTitleLocked && (
        <button
          style={styles.actionBtn}
          onClick={handleRenameStart}
          title="Rename"
          onMouseOver={(e) => { e.target.style.color = '#ccc'; e.target.style.background = '#2a2a4a'; }}
          onMouseOut={(e) => { e.target.style.color = '#666'; e.target.style.background = 'transparent'; }}
        >
          Rename
        </button>
      )}
      {showProjectMenu ? (
        <select
          style={styles.projectSelect}
          value={session.project_id || ''}
          onChange={handleMoveToProject}
          onClick={(e) => e.stopPropagation()}
          autoFocus
        >
          <option value="">(No Project)</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      ) : (
        <button
          style={styles.actionBtn}
          onClick={handleProjectToggle}
          title="Move to project"
          onMouseOver={(e) => { e.target.style.color = '#ccc'; e.target.style.background = '#2a2a4a'; }}
          onMouseOut={(e) => { e.target.style.color = '#666'; e.target.style.background = 'transparent'; }}
        >
          Move
        </button>
      )}
      <button
        style={styles.actionBtn}
        onClick={handleArchive}
        title={showArchived ? 'Unarchive' : 'Archive'}
        onMouseOver={(e) => { e.target.style.color = '#ccc'; e.target.style.background = '#2a2a4a'; }}
        onMouseOut={(e) => { e.target.style.color = '#666'; e.target.style.background = 'transparent'; }}
      >
        {showArchived ? 'Restore' : 'Archive'}
      </button>
      <button
        style={{ ...styles.actionBtn }}
        onClick={handleDelete}
        title="Delete"
        onMouseOver={(e) => { e.target.style.color = '#f87171'; e.target.style.background = '#2a2a4a'; }}
        onMouseOut={(e) => { e.target.style.color = '#666'; e.target.style.background = 'transparent'; }}
      >
        Del
      </button>
    </div>
  );

  return (
    <>
      <div
        ref={itemRef}
        style={{
          ...styles.item,
          ...(isActive ? styles.itemActive : {}),
          background: itemBackground,
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {contextAssemblyMode ? (
          <div style={styles.itemWithCheckbox}>
            <input
              type="checkbox"
              style={styles.assemblyCheckbox}
              checked={isSelectedForAssembly}
              onChange={handleCheckboxChange}
            />
            <div style={styles.itemContent}>
              {titleDisplay}
              <div style={styles.meta}>
                {formatDate(session.last_active_at)}
              </div>
            </div>
          </div>
        ) : (
          <>
            {titleDisplay}
            <div style={styles.metaRow}>
              <div style={styles.meta}>
                {formatDate(session.last_active_at)}
              </div>
              {actionButtons}
            </div>
          </>
        )}
      </div>
      {previewContent}
    </>
  );
}

export default SessionItem;
