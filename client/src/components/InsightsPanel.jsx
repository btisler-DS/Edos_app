import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import * as api from '../services/api';

const styles = {
  container: {
    padding: '20px',
    height: '100%',
    overflow: 'auto',
    background: '#12122a',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    borderBottom: '1px solid #2a2a4a',
    paddingBottom: '12px',
  },
  tab: {
    padding: '8px 16px',
    fontSize: '14px',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '6px',
    color: '#888',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: 'rgba(79, 70, 229, 0.2)',
    borderColor: 'rgba(79, 70, 229, 0.4)',
    color: '#a5b4fc',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#a5b4fc',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  card: {
    background: '#1a1a2e',
    border: '1px solid #2a2a4a',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  cardHover: {
    borderColor: '#4f46e5',
    background: '#1e1e3a',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#fff',
    marginBottom: '8px',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px',
  },
  cardContent: {
    fontSize: '14px',
    color: '#aaa',
    lineHeight: 1.5,
  },
  unresolvedEdge: {
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: '6px',
    padding: '12px',
    marginTop: '12px',
  },
  unresolvedLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#fbbf24',
    textTransform: 'uppercase',
    marginBottom: '6px',
  },
  unresolvedText: {
    fontSize: '14px',
    color: '#fcd34d',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  button: {
    padding: '6px 12px',
    fontSize: '12px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  buttonPrimary: {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
  },
  buttonSecondary: {
    background: 'transparent',
    color: '#888',
    border: '1px solid #3a3a5a',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    color: '#666',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  synthesisSection: {
    marginTop: '24px',
    padding: '20px',
    background: '#1a1a2e',
    border: '1px solid #2a2a4a',
    borderRadius: '8px',
  },
  synthesisInput: {
    width: '100%',
    padding: '12px',
    background: '#12122a',
    border: '1px solid #3a3a5a',
    borderRadius: '6px',
    color: '#eee',
    fontSize: '14px',
    outline: 'none',
    marginBottom: '12px',
  },
  synthesisResult: {
    padding: '16px',
    background: '#12122a',
    border: '1px solid #3a3a5a',
    borderRadius: '6px',
    marginTop: '12px',
  },
  synthesisAnswer: {
    fontSize: '14px',
    color: '#eee',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  },
  sourcesList: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #2a2a4a',
  },
  sourceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 0',
    fontSize: '12px',
    color: '#888',
  },
  sourceScore: {
    background: 'rgba(74, 222, 128, 0.1)',
    color: '#4ade80',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    color: '#888',
  },
  // Activity / Temporal styles
  activityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
    gap: '4px',
    marginBottom: '24px',
  },
  activityCell: {
    aspectRatio: '1',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    color: '#fff',
    cursor: 'default',
    transition: 'transform 0.1s',
  },
  activityLegend: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    fontSize: '11px',
    color: '#666',
  },
  activityLegendBox: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '24px',
  },
  statCard: {
    background: '#1a1a2e',
    border: '1px solid #2a2a4a',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#888',
  },
  recentSessionsList: {
    marginTop: '16px',
  },
  recentSession: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: '#1a1a2e',
    border: '1px solid #2a2a4a',
    borderRadius: '6px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  recentSessionTitle: {
    fontSize: '13px',
    color: '#eee',
    flex: 1,
    marginRight: '12px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  recentSessionMeta: {
    fontSize: '11px',
    color: '#888',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  messageCount: {
    background: 'rgba(79, 70, 229, 0.2)',
    color: '#a5b4fc',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
  },
  // Export styles
  exportCard: {
    background: '#1a1a2e',
    border: '1px solid #2a2a4a',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
  },
  exportTitle: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#fff',
    marginBottom: '4px',
  },
  exportDescription: {
    fontSize: '13px',
    color: '#888',
    marginBottom: '12px',
  },
  exportButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: 'none',
  },
  exportButtonPrimary: {
    background: '#4f46e5',
    color: '#fff',
  },
  exportButtonSecondary: {
    background: 'transparent',
    color: '#888',
    border: '1px solid #3a3a5a',
    marginLeft: '8px',
  },
  exportStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    marginTop: '16px',
    padding: '12px',
    background: '#12122a',
    borderRadius: '6px',
  },
  exportStat: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#888',
  },
  exportStatValue: {
    color: '#a5b4fc',
    fontWeight: 500,
  },
};

function InsightsPanel() {
  const [activeTab, setActiveTab] = useState('unresolved');
  const [unresolvedSessions, setUnresolvedSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);

  // Synthesis state
  const [synthesisQuery, setSynthesisQuery] = useState('');
  const [synthesisResult, setSynthesisResult] = useState(null);
  const [synthesizing, setSynthesizing] = useState(false);

  // Activity state
  const [activityData, setActivityData] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Export state
  const [exportStats, setExportStats] = useState(null);
  const [exporting, setExporting] = useState(null);

  const { loadSession } = useAppStore();

  useEffect(() => {
    loadUnresolvedSessions();
    loadActivityData();
    loadExportStats();
  }, []);

  const loadExportStats = async () => {
    try {
      const stats = await api.getExportStats();
      setExportStats(stats);
    } catch (error) {
      console.error('Failed to load export stats:', error);
    }
  };

  const loadActivityData = async () => {
    setLoadingActivity(true);
    try {
      const response = await fetch('/api/insights/activity?months=12');
      const data = await response.json();
      setActivityData(data);
    } catch (error) {
      console.error('Failed to load activity:', error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const loadUnresolvedSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/insights/unresolved');
      const data = await response.json();
      setUnresolvedSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to load unresolved sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (sessionId) => {
    loadSession(sessionId);
  };

  const handleResolve = async (sessionId, e) => {
    e.stopPropagation();
    const resolution = prompt('How was this resolved? (optional)');
    try {
      await fetch(`/api/insights/resolve/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      });
      loadUnresolvedSessions();
    } catch (error) {
      console.error('Failed to resolve:', error);
    }
  };

  const handleSynthesize = async () => {
    if (!synthesisQuery.trim()) return;

    setSynthesizing(true);
    setSynthesisResult(null);

    try {
      const result = await api.synthesize(synthesisQuery);
      setSynthesisResult(result);
    } catch (error) {
      console.error('Synthesis failed:', error);
      setSynthesisResult({ error: error.message });
    } finally {
      setSynthesizing(false);
    }
  };

  const renderUnresolvedTab = () => {
    if (loading) {
      return <div style={styles.loading}>Loading open questions...</div>;
    }

    if (unresolvedSessions.length === 0) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>&#10004;</div>
          <div>No open questions found</div>
          <div style={{ marginTop: '8px', fontSize: '13px' }}>
            All your inquiries have been resolved
          </div>
        </div>
      );
    }

    return (
      <div>
        <div style={styles.sectionTitle}>
          Open Questions ({unresolvedSessions.length})
        </div>
        {unresolvedSessions.map((session) => (
          <div
            key={session.id}
            style={{
              ...styles.card,
              ...(hoveredCard === session.id ? styles.cardHover : {}),
            }}
            onClick={() => handleNavigate(session.id)}
            onMouseEnter={() => setHoveredCard(session.id)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={styles.cardTitle}>{session.title}</div>
            <div style={styles.cardMeta}>
              <span>{session.relativeTime}</span>
              {session.projectName && (
                <span style={{ color: '#a5b4fc' }}>{session.projectName}</span>
              )}
            </div>
            {session.orientationBlurb && (
              <div style={styles.cardContent}>{session.orientationBlurb}</div>
            )}
            <div style={styles.unresolvedEdge}>
              <div style={styles.unresolvedLabel}>Open Question</div>
              <div style={styles.unresolvedText}>{session.unresolvedEdge}</div>
            </div>
            <div style={styles.actions}>
              <button
                style={{ ...styles.button, ...styles.buttonPrimary }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigate(session.id);
                }}
              >
                Continue Inquiry
              </button>
              <button
                style={{ ...styles.button, ...styles.buttonSecondary }}
                onClick={(e) => handleResolve(session.id, e)}
              >
                Mark Resolved
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderActivityTab = () => {
    if (loadingActivity) {
      return <div style={styles.loading}>Loading activity data...</div>;
    }

    if (!activityData) {
      return <div style={styles.loading}>No activity data available</div>;
    }

    const { byMonth, recentActive, byProject } = activityData;

    // Calculate totals
    const totalMessages = byMonth?.reduce((sum, m) => sum + m.message_count, 0) || 0;
    const totalSessions = byMonth?.reduce((sum, m) => sum + m.session_count, 0) || 0;
    const activeProjects = byProject?.length || 0;

    // Get color for activity level
    const getActivityColor = (count, max) => {
      if (count === 0) return '#1a1a2e';
      const intensity = Math.min(count / (max * 0.5), 1);
      const r = Math.round(79 + (79 - 79) * intensity);
      const g = Math.round(70 + (138 - 70) * intensity);
      const b = Math.round(229 + (229 - 229) * intensity);
      return `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.7})`;
    };

    const maxMessages = Math.max(...(byMonth?.map(m => m.message_count) || [1]));

    return (
      <div>
        <div style={styles.sectionTitle}>Overview (Last 12 Months)</div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{totalMessages}</div>
            <div style={styles.statLabel}>Messages</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{totalSessions}</div>
            <div style={styles.statLabel}>Sessions</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{activeProjects}</div>
            <div style={styles.statLabel}>Projects</div>
          </div>
        </div>

        <div style={styles.sectionTitle}>Monthly Activity</div>
        <div style={styles.activityGrid}>
          {byMonth?.map((month) => (
            <div
              key={month.month}
              style={{
                ...styles.activityCell,
                background: getActivityColor(month.message_count, maxMessages),
              }}
              title={`${month.month}: ${month.message_count} messages, ${month.session_count} sessions`}
            >
              {month.message_count > 0 && month.message_count}
            </div>
          ))}
        </div>
        <div style={styles.activityLegend}>
          <div style={{ ...styles.activityLegendBox, background: '#1a1a2e' }} />
          <span>Less</span>
          <div style={{ ...styles.activityLegendBox, background: 'rgba(79, 70, 229, 0.4)' }} />
          <div style={{ ...styles.activityLegendBox, background: 'rgba(79, 138, 229, 0.7)' }} />
          <div style={{ ...styles.activityLegendBox, background: 'rgba(79, 138, 229, 1)' }} />
          <span>More</span>
        </div>

        {recentActive && recentActive.length > 0 && (
          <>
            <div style={{ ...styles.sectionTitle, marginTop: '24px' }}>
              Most Active (Last 30 Days)
            </div>
            <div style={styles.recentSessionsList}>
              {recentActive.map((session) => (
                <div
                  key={session.id}
                  style={styles.recentSession}
                  onClick={() => handleNavigate(session.id)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#4f46e5';
                    e.currentTarget.style.background = '#1e1e3a';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#2a2a4a';
                    e.currentTarget.style.background = '#1a1a2e';
                  }}
                >
                  <span style={styles.recentSessionTitle}>
                    {session.title || 'Untitled'}
                  </span>
                  <div style={styles.recentSessionMeta}>
                    <span style={styles.messageCount}>
                      {session.message_count} msgs
                    </span>
                    <span>{session.relativeTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {byProject && byProject.length > 0 && (
          <>
            <div style={{ ...styles.sectionTitle, marginTop: '24px' }}>
              By Project
            </div>
            {byProject.map((project) => (
              <div
                key={project.id}
                style={{
                  ...styles.recentSession,
                  cursor: 'default',
                }}
              >
                <span style={styles.recentSessionTitle}>
                  {project.name}
                </span>
                <div style={styles.recentSessionMeta}>
                  <span>{project.session_count} sessions</span>
                  <span style={styles.messageCount}>
                    {project.message_count} msgs
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  const handleExport = async (type) => {
    setExporting(type);
    try {
      switch (type) {
        case 'json':
          await api.exportAsJson(false);
          break;
        case 'json-full':
          await api.exportAsJson(true);
          break;
        case 'database':
          await api.exportDatabase();
          break;
        case 'markdown':
          await api.exportAsMarkdown();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setExporting(null);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderExportTab = () => {
    return (
      <div>
        <div style={styles.sectionTitle}>Export Your Data</div>
        <p style={{ color: '#888', marginBottom: '16px', fontSize: '14px' }}>
          Your data belongs to you. Export it in multiple formats.
        </p>

        <div style={styles.exportCard}>
          <div style={styles.exportTitle}>Full Database Backup</div>
          <div style={styles.exportDescription}>
            SQLite database file. Complete backup that can be restored later.
          </div>
          <button
            style={{ ...styles.exportButton, ...styles.exportButtonPrimary }}
            onClick={() => handleExport('database')}
            disabled={exporting === 'database'}
          >
            {exporting === 'database' ? 'Exporting...' : 'Download .db'}
          </button>
        </div>

        <div style={styles.exportCard}>
          <div style={styles.exportTitle}>JSON Export</div>
          <div style={styles.exportDescription}>
            All sessions, messages, and metadata in JSON format.
          </div>
          <button
            style={{ ...styles.exportButton, ...styles.exportButtonPrimary }}
            onClick={() => handleExport('json')}
            disabled={exporting === 'json'}
          >
            {exporting === 'json' ? 'Exporting...' : 'Download .json'}
          </button>
          <button
            style={{ ...styles.exportButton, ...styles.exportButtonSecondary }}
            onClick={() => handleExport('json-full')}
            disabled={exporting === 'json-full'}
            title="Includes embedding vectors (large file)"
          >
            {exporting === 'json-full' ? 'Exporting...' : 'Include Embeddings'}
          </button>
        </div>

        <div style={styles.exportCard}>
          <div style={styles.exportTitle}>Markdown Export</div>
          <div style={styles.exportDescription}>
            Each session as a .md file with YAML frontmatter. ZIP archive.
          </div>
          <button
            style={{ ...styles.exportButton, ...styles.exportButtonPrimary }}
            onClick={() => handleExport('markdown')}
            disabled={exporting === 'markdown'}
          >
            {exporting === 'markdown' ? 'Exporting...' : 'Download .zip'}
          </button>
        </div>

        {exportStats && (
          <div style={styles.exportStats}>
            <div style={styles.exportStat}>
              <span>Sessions</span>
              <span style={styles.exportStatValue}>{exportStats.sessions}</span>
            </div>
            <div style={styles.exportStat}>
              <span>Messages</span>
              <span style={styles.exportStatValue}>{exportStats.messages}</span>
            </div>
            <div style={styles.exportStat}>
              <span>Projects</span>
              <span style={styles.exportStatValue}>{exportStats.projects}</span>
            </div>
            <div style={styles.exportStat}>
              <span>Documents</span>
              <span style={styles.exportStatValue}>{exportStats.documents}</span>
            </div>
            <div style={styles.exportStat}>
              <span>Anchors</span>
              <span style={styles.exportStatValue}>{exportStats.anchors}</span>
            </div>
            <div style={styles.exportStat}>
              <span>Database Size</span>
              <span style={styles.exportStatValue}>
                {formatBytes(exportStats.databaseSizeBytes)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSynthesisTab = () => {
    return (
      <div>
        <div style={styles.sectionTitle}>Cross-Session Synthesis</div>
        <p style={{ color: '#888', marginBottom: '16px', fontSize: '14px' }}>
          Ask a question and get an answer synthesized from your past thinking sessions.
        </p>

        <div style={styles.synthesisSection}>
          <input
            type="text"
            style={styles.synthesisInput}
            placeholder="What have I concluded about...?"
            value={synthesisQuery}
            onChange={(e) => setSynthesisQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSynthesize()}
          />
          <button
            style={{
              ...styles.button,
              ...styles.buttonPrimary,
              opacity: synthesizing ? 0.6 : 1,
            }}
            onClick={handleSynthesize}
            disabled={synthesizing || !synthesisQuery.trim()}
          >
            {synthesizing ? 'Synthesizing...' : 'Synthesize'}
          </button>

          {synthesisResult && !synthesisResult.error && (
            <div style={styles.synthesisResult}>
              <div style={styles.synthesisAnswer}>{synthesisResult.answer}</div>
              {synthesisResult.sources && synthesisResult.sources.length > 0 && (
                <div style={styles.sourcesList}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                    Sources ({synthesisResult.sessionsAnalyzed} sessions analyzed)
                  </div>
                  {synthesisResult.sources.map((source) => (
                    <div
                      key={source.id}
                      style={{ ...styles.sourceItem, cursor: 'pointer' }}
                      onClick={() => handleNavigate(source.id)}
                    >
                      <span style={styles.sourceScore}>{Math.round(source.score * 100)}%</span>
                      <span style={{ color: '#a5b4fc' }}>{source.title}</span>
                      {source.hasUnresolved && (
                        <span style={{ color: '#fbbf24' }}>&#9888;</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {synthesisResult?.error && (
            <div style={{ ...styles.synthesisResult, borderColor: '#f87171' }}>
              <div style={{ color: '#f87171' }}>Error: {synthesisResult.error}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Insights</h2>
        <p style={styles.subtitle}>Track open questions and synthesize knowledge</p>
      </div>

      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'unresolved' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('unresolved')}
        >
          Open Questions {unresolvedSessions.length > 0 && `(${unresolvedSessions.length})`}
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'activity' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('activity')}
        >
          Activity
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'synthesis' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('synthesis')}
        >
          Synthesis
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'export' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('export')}
        >
          Export
        </button>
      </div>

      {activeTab === 'unresolved' && renderUnresolvedTab()}
      {activeTab === 'activity' && renderActivityTab()}
      {activeTab === 'synthesis' && renderSynthesisTab()}
      {activeTab === 'export' && renderExportTab()}
    </div>
  );
}

export default InsightsPanel;
