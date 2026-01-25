import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';

/**
 * Parse freeform date input into start/end date strings (YYYY-MM-DD format)
 * Supports formats like:
 * - "2024" -> full year
 * - "Jan 2024" or "January 2024" -> full month
 * - "01/2024" or "1/2024" -> month/year
 * - "01/15/2024" or "1/15/2024" -> specific date (MM/DD/YYYY)
 * - "15/01/2024" -> specific date (DD/MM/YYYY) if day > 12
 * - "Jan 2024 to Mar 2024" -> range
 * - "2023 to 2024" -> year range
 */
function parseDateInput(input) {
  if (!input || !input.trim()) {
    return { startDate: null, endDate: null };
  }

  const text = input.trim().toLowerCase();

  // Check for range separator
  const rangeMatch = text.match(/(.+?)\s*(?:to|-)\s*(.+)/i);
  if (rangeMatch) {
    const start = parseSingleDate(rangeMatch[1].trim(), 'start');
    const end = parseSingleDate(rangeMatch[2].trim(), 'end');
    return { startDate: start, endDate: end };
  }

  // Single date/period
  const startDate = parseSingleDate(text, 'start');
  const endDate = parseSingleDate(text, 'end');
  return { startDate, endDate };
}

function parseSingleDate(text, mode) {
  const months = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  // Just year: "2024"
  const yearOnly = text.match(/^(\d{4})$/);
  if (yearOnly) {
    const year = parseInt(yearOnly[1]);
    if (mode === 'start') {
      return `${year}-01-01`;
    } else {
      return `${year}-12-31`;
    }
  }

  // Month + Year: "Jan 2024" or "January 2024"
  const monthYear = text.match(/^([a-z]+)\s*(\d{4})$/i);
  if (monthYear) {
    const monthName = monthYear[1].toLowerCase();
    const year = parseInt(monthYear[2]);
    const month = months[monthName];
    if (month !== undefined) {
      if (mode === 'start') {
        return `${year}-${String(month + 1).padStart(2, '0')}-01`;
      } else {
        const lastDay = new Date(year, month + 1, 0).getDate();
        return `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
      }
    }
  }

  // MM/YYYY format: "01/2024" or "1/2024"
  const mmYyyy = text.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmYyyy) {
    const month = parseInt(mmYyyy[1]);
    const year = parseInt(mmYyyy[2]);
    if (month >= 1 && month <= 12) {
      if (mode === 'start') {
        return `${year}-${String(month).padStart(2, '0')}-01`;
      } else {
        const lastDay = new Date(year, month, 0).getDate();
        return `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      }
    }
  }

  // Full date: MM/DD/YYYY or DD/MM/YYYY
  const fullDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fullDate) {
    let month = parseInt(fullDate[1]);
    let day = parseInt(fullDate[2]);
    const year = parseInt(fullDate[3]);

    // If first number > 12, assume DD/MM/YYYY
    if (month > 12 && day <= 12) {
      [month, day] = [day, month];
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // YYYY-MM-DD format (ISO)
  const isoDate = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoDate) {
    const year = parseInt(isoDate[1]);
    const month = parseInt(isoDate[2]);
    const day = parseInt(isoDate[3]);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

const styles = {
  panel: {
    width: '300px',
    maxWidth: '80vw',
    height: '100%',
    background: '#12122a',
    borderRight: '1px solid #2a2a4a',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    flexShrink: 0,
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid #2a2a4a',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  closeButton: {
    background: 'transparent',
    border: '1px solid #3a3a5a',
    color: '#888',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  typeSelector: {
    padding: '12px 16px',
    borderBottom: '1px solid #1a1a3a',
    display: 'flex',
    gap: '8px',
  },
  typeButton: {
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#666',
    background: 'transparent',
    border: 'none',
    fontSize: '12px',
    transition: 'all 0.15s',
  },
  typeButtonActive: {
    color: '#ccc',
    background: '#2a2a4a',
  },
  searchBar: {
    padding: '12px 16px',
    borderBottom: '1px solid #1a1a3a',
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px',
    background: '#1a1a3a',
    border: '1px solid #2a2a4a',
    borderRadius: '6px',
    color: '#eee',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  dateInputs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  dateInput: {
    flex: 1,
    padding: '8px 10px',
    background: '#1a1a3a',
    border: '1px solid #2a2a4a',
    borderRadius: '4px',
    color: '#ccc',
    fontSize: '12px',
    outline: 'none',
  },
  dateHint: {
    fontSize: '11px',
    color: '#666',
    marginTop: '6px',
    lineHeight: 1.3,
  },
  searchButton: {
    width: '100%',
    padding: '10px',
    background: '#4f46e5',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background 0.15s',
  },
  results: {
    flex: 1,
    overflow: 'auto',
  },
  resultItem: {
    padding: '12px 16px',
    borderBottom: '1px solid #1a1a3a',
    cursor: 'pointer',
    transition: 'background 0.1s',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  resultItemHover: {
    background: '#1a1a3a',
  },
  resultItemSelected: {
    background: '#1a2a3a',
    borderLeft: '3px solid #4f46e5',
  },
  checkbox: {
    marginTop: '3px',
    cursor: 'pointer',
  },
  resultContent: {
    flex: 1,
    minWidth: 0,
  },
  resultTitle: {
    fontSize: '14px',
    color: '#ddd',
    marginBottom: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  resultSnippet: {
    fontSize: '12px',
    color: '#888',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  resultMeta: {
    fontSize: '11px',
    color: '#666',
    marginTop: '4px',
  },
  resultScore: {
    fontSize: '11px',
    color: '#4f46e5',
    marginLeft: '8px',
  },
  badge: {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: 600,
    marginLeft: '8px',
    letterSpacing: '0.3px',
  },
  badgeImported: {
    background: '#1e3a5f',
    color: '#93c5fd',
  },
  badgeNative: {
    background: '#1a2e1a',
    color: '#86efac',
  },
  loadingText: {
    padding: '24px 16px',
    textAlign: 'center',
    color: '#666',
    fontSize: '13px',
  },
  emptyText: {
    padding: '24px 16px',
    textAlign: 'center',
    color: '#666',
    fontSize: '13px',
  },
  assemblyBar: {
    padding: '12px 16px',
    borderTop: '1px solid #2a2a4a',
    background: '#1a1a3a',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  selectionCount: {
    fontSize: '12px',
    color: '#888',
    flex: 1,
  },
  assembleButton: {
    padding: '8px 16px',
    background: '#059669',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  clearButton: {
    padding: '8px 12px',
    background: 'transparent',
    border: '1px solid #3a3a5a',
    borderRadius: '4px',
    color: '#888',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
};

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function RetrievePanel() {
  const {
    setRetrieveMode,
    searchType,
    setSearchType,
    searchQuery,
    setSearchQuery,
    setSearchDateRange,
    searchResults,
    searchLoading,
    searchSelections,
    performSearch,
    toggleSearchSelection,
    clearSearchSelections,
    clearSearchResults,
    assembleFromSearch,
    selectSession,
  } = useAppStore();

  const [hoveredId, setHoveredId] = useState(null);
  const [dateQuery, setDateQuery] = useState('');

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSearch = () => {
    // For date search, parse the freeform input first
    if (searchType === 'date') {
      const { startDate, endDate } = parseDateInput(dateQuery);
      setSearchDateRange(startDate, endDate);
      // Small delay to ensure state updates before search
      setTimeout(() => performSearch(), 10);
    } else {
      performSearch();
    }
  };

  const handleClose = () => {
    setRetrieveMode(false);
    clearSearchResults();
    setDateQuery('');
  };

  const handleItemClick = (sessionId, e) => {
    // If checkbox was clicked, don't navigate
    if (e.target.type === 'checkbox') return;

    // Navigate to session
    selectSession(sessionId);
    setRetrieveMode(false);
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Retrieve</span>
        <button
          style={styles.closeButton}
          onClick={handleClose}
          onMouseOver={(e) => {
            e.target.style.borderColor = '#4f46e5';
            e.target.style.color = '#ccc';
          }}
          onMouseOut={(e) => {
            e.target.style.borderColor = '#3a3a5a';
            e.target.style.color = '#888';
          }}
        >
          Close
        </button>
      </div>

      {/* Search Type Selector */}
      <div style={styles.typeSelector}>
        {['keyword', 'date', 'concept'].map((type) => (
          <button
            key={type}
            style={{
              ...styles.typeButton,
              ...(searchType === type ? styles.typeButtonActive : {}),
            }}
            onClick={() => setSearchType(type)}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div style={styles.searchBar}>
        {searchType === 'date' ? (
          <>
            <input
              type="text"
              style={styles.searchInput}
              value={dateQuery}
              onChange={(e) => setDateQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g. Jan 2024, 2023, or Jan 2024 to Mar 2024"
              autoFocus
            />
            <div style={styles.dateHint}>
              Formats: Jan 2024, 01/2024, 2024, or use "to" for ranges
            </div>
          </>
        ) : (
          <input
            type="text"
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={searchType === 'keyword' ? 'Search by keyword...' : 'Search by concept...'}
            autoFocus
          />
        )}
        <button
          style={styles.searchButton}
          onClick={handleSearch}
          disabled={searchLoading}
          onMouseOver={(e) => (e.target.style.background = '#4338ca')}
          onMouseOut={(e) => (e.target.style.background = '#4f46e5')}
        >
          {searchLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Results */}
      <div style={styles.results}>
        {searchLoading ? (
          <div style={styles.loadingText}>Searching...</div>
        ) : searchResults.length === 0 ? (
          <div style={styles.emptyText}>
            {(searchType === 'date' ? dateQuery : searchQuery)
              ? 'No results found'
              : 'Enter a search term to find past inquiries'}
          </div>
        ) : (
          searchResults.map((result) => {
            const isSelected = searchSelections.includes(result.sessionId);
            const isHovered = hoveredId === result.sessionId;

            return (
              <div
                key={result.sessionId}
                style={{
                  ...styles.resultItem,
                  ...(isSelected ? styles.resultItemSelected : {}),
                  ...(isHovered && !isSelected ? styles.resultItemHover : {}),
                }}
                onClick={(e) => handleItemClick(result.sessionId, e)}
                onMouseEnter={() => setHoveredId(result.sessionId)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={isSelected}
                  onChange={() => toggleSearchSelection(result.sessionId)}
                />
                <div style={styles.resultContent}>
                  <div style={styles.resultTitle}>{result.title}</div>
                  {result.snippet && (
                    <div style={styles.resultSnippet}>{result.snippet}</div>
                  )}
                  <div style={styles.resultMeta}>
                    {formatRelativeTime(result.timestamp)}
                    {result.source && <span> · {result.source.replace('_', ' ')}</span>}
                    {result.score !== undefined && (
                      <span style={styles.resultScore}>
                        {Math.round(result.score * 100)}% match
                      </span>
                    )}
                    {result.badge && (
                      <span style={{
                        ...styles.badge,
                        ...(result.badge === 'Imported' ? styles.badgeImported : styles.badgeNative),
                      }}>
                        {result.badge}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Assembly Bar */}
      {searchSelections.length > 0 && (
        <div style={styles.assemblyBar}>
          <span style={styles.selectionCount}>
            {searchSelections.length} selected
          </span>
          <button
            style={styles.clearButton}
            onClick={clearSearchSelections}
            onMouseOver={(e) => {
              e.target.style.borderColor = '#4f46e5';
              e.target.style.color = '#ccc';
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = '#3a3a5a';
              e.target.style.color = '#888';
            }}
          >
            Clear
          </button>
          <button
            style={styles.assembleButton}
            onClick={assembleFromSearch}
            onMouseOver={(e) => (e.target.style.background = '#047857')}
            onMouseOut={(e) => (e.target.style.background = '#059669')}
          >
            Assemble Context
          </button>
        </div>
      )}
    </div>
  );
}

export default RetrievePanel;
