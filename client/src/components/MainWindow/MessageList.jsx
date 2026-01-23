import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/appStore';

const styles = {
  container: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
  },
  messageWrapper: {
    position: 'relative',
    marginBottom: '24px',
    maxWidth: '800px',
  },
  userWrapper: {
    marginLeft: 'auto',
    marginRight: '0',
  },
  assistantWrapper: {
    marginLeft: '0',
    marginRight: 'auto',
  },
  role: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginBottom: '8px',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  userRole: {
    color: '#818cf8',
    justifyContent: 'flex-end',
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
  anchoredContent: {
    borderLeft: '3px solid #f59e0b',
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
  anchorButton: {
    background: 'transparent',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    padding: '2px 6px',
    fontSize: '11px',
    borderRadius: '3px',
    opacity: 0,
    transition: 'opacity 0.15s, color 0.15s',
  },
  anchorButtonVisible: {
    opacity: 1,
  },
  anchorLabel: {
    fontSize: '11px',
    color: '#f59e0b',
    fontWeight: 500,
  },
  systemMessage: {
    margin: '16px auto',
    padding: '12px 16px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    maxWidth: '500px',
    textAlign: 'center',
  },
  systemContent: {
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },
};

// Add keyframes for pulse animation
const pulseKeyframes = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
`;

function MessageItem({ message, anchor, onCreateAnchor }) {
  const [hovered, setHovered] = useState(false);

  const handleAnchorClick = () => {
    const label = prompt('Enter anchor label:');
    if (label && label.trim()) {
      onCreateAnchor(message.id, label.trim());
    }
  };

  const isUser = message.role === 'user';

  return (
    <div
      style={{
        ...styles.messageWrapper,
        ...(isUser ? styles.userWrapper : styles.assistantWrapper),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          ...styles.role,
          ...(isUser ? styles.userRole : styles.assistantRole),
        }}
      >
        {isUser ? 'You' : 'Assistant'}
        {anchor && <span style={styles.anchorLabel}>{anchor.label}</span>}
        {!anchor && (
          <button
            style={{
              ...styles.anchorButton,
              ...(hovered ? styles.anchorButtonVisible : {}),
            }}
            onClick={handleAnchorClick}
            title="Add anchor"
          >
            + anchor
          </button>
        )}
      </div>
      <div
        style={{
          ...styles.content,
          ...(isUser ? styles.userContent : styles.assistantContent),
          ...(anchor ? styles.anchoredContent : {}),
        }}
      >
        {message.content}
      </div>
    </div>
  );
}

function MessageList() {
  const { messages, anchors, isStreaming, streamingContent, createAnchor } = useAppStore();
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

  // Build anchor lookup by message ID
  const anchorByMessageId = {};
  anchors.forEach((a) => {
    anchorByMessageId[a.message_id] = a;
  });

  const handleCreateAnchor = async (messageId, label) => {
    try {
      await createAnchor(messageId, label);
    } catch (error) {
      alert('Failed to create anchor: ' + error.message);
    }
  };

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
        message.role === 'system' ? (
          <div key={message.id} style={styles.systemMessage}>
            <div style={styles.systemContent}>{message.content}</div>
          </div>
        ) : (
          <MessageItem
            key={message.id}
            message={message}
            anchor={anchorByMessageId[message.id]}
            onCreateAnchor={handleCreateAnchor}
          />
        )
      ))}

      {isStreaming && streamingContent && (
        <div style={{ ...styles.messageWrapper, ...styles.assistantWrapper }}>
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
