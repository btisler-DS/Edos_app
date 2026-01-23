import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';

const styles = {
  container: {
    padding: '16px 20px 24px',
    borderTop: '1px solid #2a2a4a',
    background: '#16162a',
  },
  form: {
    display: 'flex',
    gap: '12px',
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
    padding: '14px 24px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s, opacity 0.2s',
    alignSelf: 'flex-end',
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
  const { sendMessage, isStreaming } = useAppStore();

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

  const canSubmit = input.trim() && !isStreaming;

  return (
    <div style={styles.container}>
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
