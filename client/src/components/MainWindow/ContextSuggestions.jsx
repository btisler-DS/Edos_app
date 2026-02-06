import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import * as api from '../../services/api';

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto 8px',
    animation: 'fadeIn 0.2s ease-out',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#888',
    marginBottom: '6px',
    paddingLeft: '4px',
  },
  icon: {
    width: '14px',
    height: '14px',
    opacity: 0.7,
  },
  suggestions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  suggestion: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 12px',
    background: 'rgba(79, 70, 229, 0.08)',
    border: '1px solid rgba(79, 70, 229, 0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  suggestionHover: {
    background: 'rgba(79, 70, 229, 0.15)',
    borderColor: 'rgba(79, 70, 229, 0.4)',
  },
  suggestionContent: {
    flex: 1,
    minWidth: 0,
  },
  suggestionTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#a5b4fc',
    marginBottom: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  suggestionPreview: {
    fontSize: '12px',
    color: '#888',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  suggestionMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  time: {
    fontSize: '11px',
    color: '#666',
  },
  score: {
    fontSize: '11px',
    color: '#4ade80',
    background: 'rgba(74, 222, 128, 0.1)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  unresolved: {
    fontSize: '10px',
    color: '#fbbf24',
    background: 'rgba(251, 191, 36, 0.1)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexShrink: 0,
  },
  actionButton: {
    padding: '4px 8px',
    fontSize: '11px',
    background: 'transparent',
    border: '1px solid #3a3a5a',
    borderRadius: '4px',
    color: '#888',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },
  actionButtonPrimary: {
    background: 'rgba(79, 70, 229, 0.2)',
    borderColor: 'rgba(79, 70, 229, 0.4)',
    color: '#a5b4fc',
  },
  dismiss: {
    padding: '4px 8px',
    fontSize: '11px',
    background: 'transparent',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
};

// Debounce helper
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function ContextSuggestions({ query, onInjectContext, onNavigate }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const { currentSession } = useAppStore();

  // Debounce the query to avoid too many API calls
  const debouncedQuery = useDebounce(query, 800);

  // Search for related sessions when query changes
  useEffect(() => {
    const searchForContext = async () => {
      // Reset dismissed state when query changes significantly
      setDismissed(false);

      // Only search if query is long enough
      if (!debouncedQuery || debouncedQuery.trim().length < 20) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await api.searchSimilarSessions(
          debouncedQuery,
          currentSession?.id,
          3,
          0.35
        );
        setSuggestions(response.results || []);
      } catch (error) {
        console.error('Context search failed:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    searchForContext();
  }, [debouncedQuery, currentSession?.id]);

  // Don't render if no suggestions or dismissed
  if (dismissed || suggestions.length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      <div style={styles.header}>
        <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <span>Related from your past thinking</span>
        <button
          style={styles.dismiss}
          onClick={() => setDismissed(true)}
          title="Dismiss suggestions"
        >
          Dismiss
        </button>
      </div>

      <div style={styles.suggestions}>
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            style={{
              ...styles.suggestion,
              ...(hoveredId === suggestion.id ? styles.suggestionHover : {}),
            }}
            onMouseEnter={() => setHoveredId(suggestion.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div style={styles.suggestionContent}>
              <div style={styles.suggestionTitle}>{suggestion.title}</div>
              {suggestion.preview && (
                <div style={styles.suggestionPreview}>{suggestion.preview}</div>
              )}
              <div style={styles.suggestionMeta}>
                <span style={styles.time}>{suggestion.relativeTime}</span>
                <span style={styles.score}>{Math.round(suggestion.score * 100)}% match</span>
                {suggestion.hasUnresolved && (
                  <span style={styles.unresolved}>has open question</span>
                )}
              </div>
            </div>
            <div style={styles.actions}>
              <button
                style={{ ...styles.actionButton, ...styles.actionButtonPrimary }}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate?.(suggestion.id);
                }}
              >
                Open
              </button>
              <button
                style={styles.actionButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onInjectContext?.(suggestion);
                }}
              >
                Add context
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ContextSuggestions;
