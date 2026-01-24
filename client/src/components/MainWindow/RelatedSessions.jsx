import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';

const styles = {
  container: {
    borderBottom: '1px solid #2a2a4a',
    background: '#151528',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  headerLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  arrow: {
    fontSize: '12px',
    color: '#666',
    transition: 'transform 0.2s ease',
  },
  arrowOpen: {
    fontSize: '12px',
    color: '#666',
    transition: 'transform 0.2s ease',
    transform: 'rotate(180deg)',
  },
  content: {
    padding: '0 16px 12px 16px',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    marginBottom: '4px',
    background: '#1a1a3a',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  itemHover: {
    background: '#252550',
  },
  title: {
    fontSize: '13px',
    color: '#ccc',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    marginRight: '12px',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  time: {
    fontSize: '11px',
    color: '#555',
  },
  score: {
    fontSize: '10px',
    color: '#444',
    fontFamily: 'monospace',
  },
  loading: {
    padding: '8px 16px',
    fontSize: '12px',
    color: '#555',
    fontStyle: 'italic',
  },
  empty: {
    padding: '8px 16px',
    fontSize: '12px',
    color: '#444',
  },
};

function formatRelativeTime(timestamp) {
  const date = new Date(timestamp);
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

function RelatedSessions() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const { relatedSessions, relatedSessionsLoading, selectSession } = useAppStore();

  // Don't render if no related sessions and not loading
  if (relatedSessions.length === 0 && !relatedSessionsLoading) {
    return null;
  }

  const handleItemClick = (sessionId) => {
    selectSession(sessionId);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <span style={styles.headerLabel}>
          Related Inquiries ({relatedSessions.length})
        </span>
        <span style={isExpanded ? styles.arrowOpen : styles.arrow}>
          &#9662;
        </span>
      </div>
      {isExpanded && (
        <div style={styles.content}>
          {relatedSessionsLoading ? (
            <div style={styles.loading}>Finding related inquiries...</div>
          ) : relatedSessions.length === 0 ? (
            <div style={styles.empty}>No related inquiries found</div>
          ) : (
            relatedSessions.map((session) => (
              <div
                key={session.id}
                style={{
                  ...styles.item,
                  ...(hoveredId === session.id ? styles.itemHover : {}),
                }}
                onClick={() => handleItemClick(session.id)}
                onMouseEnter={() => setHoveredId(session.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <span style={styles.title}>
                  {session.title || 'Untitled Inquiry'}
                </span>
                <div style={styles.meta}>
                  <span style={styles.time}>
                    {formatRelativeTime(session.timestamp)}
                  </span>
                  {session.score && (
                    <span style={styles.score}>
                      {Math.round(session.score * 100)}%
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default RelatedSessions;
