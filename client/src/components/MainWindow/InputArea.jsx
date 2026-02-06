import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import ContextSuggestions from './ContextSuggestions';

const styles = {
  container: {
    padding: '12px 12px 16px',
    borderTop: '1px solid #2a2a4a',
    background: '#16162a',
  },
  searchIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '8px 16px',
    marginBottom: '8px',
    background: 'rgba(79, 70, 229, 0.1)',
    border: '1px solid rgba(79, 70, 229, 0.3)',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#a5b4fc',
    maxWidth: '800px',
    margin: '0 auto 8px',
  },
  searchSpinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(165, 180, 252, 0.3)',
    borderTop: '2px solid #a5b4fc',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  form: {
    display: 'flex',
    gap: '8px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  textareaWrapper: {
    flex: 1,
    position: 'relative',
  },
  textarea: {
    width: '100%',
    padding: '14px 16px',
    background: '#1e1e3a',
    border: '1px solid #3a3a5a',
    borderRadius: '12px',
    color: '#eee',
    fontSize: '15px',
    lineHeight: '1.5',
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    minHeight: '52px',
    maxHeight: '200px',
  },
  textareaFocused: {
    borderColor: '#4f46e5',
  },
  button: {
    padding: '12px 16px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s, opacity 0.2s',
    alignSelf: 'flex-end',
    flexShrink: 0,
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  hint: {
    fontSize: '12px',
    color: '#666',
    marginTop: '8px',
    textAlign: 'center',
  },
};

function InputArea() {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);
  const {
    sendMessage,
    isStreaming,
    isWebSearching,
    webSearchQuery,
    isUrlFetching,
    urlFetchCount,
    loadSession,
  } = useAppStore();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setInput('');
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Navigate to a suggested session
  const handleNavigateToSession = useCallback((sessionId) => {
    loadSession(sessionId);
  }, [loadSession]);

  // Inject context from a suggested session
  const handleInjectContext = useCallback((suggestion) => {
    // Prepend a reference to the suggested session in the input
    const contextNote = `[Continuing from "${suggestion.title}" (${suggestion.relativeTime})]\n\n`;
    setInput(prev => contextNote + prev);

    // Focus the textarea
    textareaRef.current?.focus();
  }, []);

  const canSubmit = input.trim() && !isStreaming;

  return (
    <div style={styles.container}>
      {/* CSS keyframes for spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Web search indicator */}
      {isWebSearching && (
        <div style={styles.searchIndicator}>
          <div style={styles.searchSpinner} />
          <span>Searching: "{webSearchQuery}"</span>
        </div>
      )}

      {/* URL fetch indicator */}
      {isUrlFetching && (
        <div style={styles.searchIndicator}>
          <div style={styles.searchSpinner} />
          <span>Fetching {urlFetchCount} URL{urlFetchCount > 1 ? 's' : ''}...</span>
        </div>
      )}

      {/* Context suggestions based on what user is typing */}
      {!isStreaming && (
        <ContextSuggestions
          query={input}
          onNavigate={handleNavigateToSession}
          onInjectContext={handleInjectContext}
        />
      )}

      <form style={styles.form} onSubmit={handleSubmit}>
        <div style={styles.textareaWrapper}>
          <textarea
            ref={textareaRef}
            style={{
              ...styles.textarea,
              ...(isFocused ? styles.textareaFocused : {}),
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
            disabled={isStreaming}
            rows={1}
          />
        </div>
        <button
          type="submit"
          style={{
            ...styles.button,
            ...(canSubmit ? {} : styles.buttonDisabled),
          }}
          disabled={!canSubmit}
          onMouseOver={(e) => canSubmit && (e.target.style.background = '#4338ca')}
          onMouseOut={(e) => canSubmit && (e.target.style.background = '#4f46e5')}
        >
          {isStreaming ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

export default InputArea;
