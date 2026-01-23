import React from 'react';
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
  const { sessions } = useAppStore();

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
      {sessions.map((session) => (
        <SessionItem key={session.id} session={session} />
      ))}
    </div>
  );
}

export default SessionList;
