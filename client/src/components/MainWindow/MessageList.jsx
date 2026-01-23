import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/appStore';

const styles = {
  container: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
  },
  message: {
    marginBottom: '24px',
    maxWidth: '800px',
  },
  userMessage: {
    marginLeft: 'auto',
    marginRight: '0',
  },
  assistantMessage: {
    marginLeft: '0',
    marginRight: 'auto',
  },
  role: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginBottom: '8px',
    letterSpacing: '0.5px',
  },
  userRole: {
    color: '#818cf8',
    textAlign: 'right',
  },
  assistantRole: {
    color: '#4ade80',
  },
  content: {
    padding: '16px',
    borderRadius: '12px',
    fontSize: '15px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  userContent: {
    background: '#3730a3',
    color: '#fff',
    borderBottomRightRadius: '4px',
  },
  assistantContent: {
    background: '#1e1e3a',
    color: '#eee',
    borderBottomLeftRadius: '4px',
  },
  streaming: {
    opacity: 0.8,
  },
  streamingIndicator: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    background: '#4ade80',
    borderRadius: '50%',
    marginLeft: '8px',
    animation: 'pulse 1s ease-in-out infinite',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#666',
    fontSize: '15px',
  },
};

// Add keyframes for pulse animation
const pulseKeyframes = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
`;

function MessageList() {
  const { messages, isStreaming, streamingContent } = useAppStore();
  const containerRef = useRef(null);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Inject keyframes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = pulseKeyframes;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          Start your inquiry by typing a message below.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} ref={containerRef}>
      {messages.map((message) => (
        <div
          key={message.id}
          style={{
            ...styles.message,
            ...(message.role === 'user' ? styles.userMessage : styles.assistantMessage),
          }}
        >
          <div
            style={{
              ...styles.role,
              ...(message.role === 'user' ? styles.userRole : styles.assistantRole),
            }}
          >
            {message.role === 'user' ? 'You' : 'Assistant'}
          </div>
          <div
            style={{
              ...styles.content,
              ...(message.role === 'user' ? styles.userContent : styles.assistantContent),
            }}
          >
            {message.content}
          </div>
        </div>
      ))}

      {isStreaming && streamingContent && (
        <div style={{ ...styles.message, ...styles.assistantMessage }}>
          <div style={{ ...styles.role, ...styles.assistantRole }}>
            Assistant
            <span style={styles.streamingIndicator} />
          </div>
          <div style={{ ...styles.content, ...styles.assistantContent, ...styles.streaming }}>
            {streamingContent}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

export default MessageList;
