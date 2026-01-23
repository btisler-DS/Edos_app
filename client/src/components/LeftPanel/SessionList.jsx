import React, { useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import SessionItem from './SessionItem';

const styles = {
  empty: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#666',
    fontSize: '14px',
  },
};

function SessionList() {
  const { sessions, sessionSortBy } = useAppStore();

  const sortedSessions = useMemo(() => {
    if (!sessions.length) return sessions;

    return [...sessions].sort((a, b) => {
      if (sessionSortBy === 'created') {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      // Default: last_active
      return new Date(b.last_active_at) - new Date(a.last_active_at);
    });
  }, [sessions, sessionSortBy]);

  if (sessions.length === 0) {
    return (
      <div style={styles.empty}>
        No inquiries yet.<br />
        Click "New Inquiry" to start.
      </div>
    );
  }

  return (
    <div>
      {sortedSessions.map((session) => (
        <SessionItem key={session.id} session={session} />
      ))}
    </div>
  );
}

export default SessionList;
