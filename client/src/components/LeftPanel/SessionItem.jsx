import React, { useState } from 'react';
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
  title: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#eee',
    marginBottom: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meta: {
    fontSize: '12px',
    color: '#666',
  },
  preview: {
    position: 'absolute',
    left: '100%',
    top: '0',
    width: '300px',
    background: '#1e1e3a',
    border: '1px solid #3a3a5a',
    borderRadius: '8px',
    padding: '16px',
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
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

function SessionItem({ session }) {
  const { activeSessionId, selectSession } = useAppStore();
  const [showPreview, setShowPreview] = useState(false);

  const isActive = activeSessionId === session.id;
  const hasMetadata = session.orientation_blurb || session.unresolved_edge || session.last_pivot;

  return (
    <div
      style={{
        ...styles.item,
        ...(isActive ? styles.itemActive : {}),
        background: isActive ? '#2a2a4a' : (showPreview ? '#1a1a3a' : 'transparent'),
      }}
      onClick={() => selectSession(session.id)}
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      <div style={styles.title}>
        {session.title || 'Untitled Inquiry'}
      </div>
      <div style={styles.meta}>
        {formatDate(session.last_active_at)}
      </div>

      {showPreview && hasMetadata && (
        <div style={styles.preview}>
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
        </div>
      )}
    </div>
  );
}

export default SessionItem;
