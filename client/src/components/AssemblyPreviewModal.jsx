import React from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../store/appStore';

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modal: {
    background: '#1a1a2e',
    border: '1px solid #2a2a4a',
    borderRadius: '12px',
    width: '520px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  header: {
    padding: '20px 24px 16px',
    borderBottom: '1px solid #2a2a4a',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#eee',
    marginBottom: '8px',
  },
  headerMeta: {
    fontSize: '13px',
    color: '#888',
    display: 'flex',
    gap: '16px',
  },
  body: {
    flex: 1,
    overflow: 'auto',
    padding: '8px 0',
  },
  item: {
    padding: '12px 24px',
    borderBottom: '1px solid #1a1a3a',
  },
  itemTitle: {
    fontSize: '14px',
    color: '#ddd',
    fontWeight: 500,
    marginBottom: '4px',
  },
  itemSnippet: {
    fontSize: '12px',
    color: '#888',
    lineHeight: 1.4,
    maxHeight: '40px',
    overflow: 'hidden',
  },
  itemMeta: {
    fontSize: '11px',
    color: '#666',
    marginTop: '4px',
    display: 'flex',
    gap: '8px',
  },
  itemProject: {
    color: '#4f46e5',
  },
  itemOrder: {
    fontSize: '11px',
    color: '#4f46e5',
    fontWeight: 600,
    marginRight: '8px',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #2a2a4a',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelButton: {
    padding: '10px 20px',
    background: 'transparent',
    border: '1px solid #3a3a5a',
    borderRadius: '6px',
    color: '#888',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  assembleButton: {
    padding: '10px 20px',
    background: '#059669',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
};

function estimateTokens(text) {
  if (!text) return 0;
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4);
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
}

function AssemblyPreviewModal() {
  const { assemblyPreview, hideAssemblyPreview, confirmAssembly } = useAppStore();

  if (!assemblyPreview) return null;

  const { items } = assemblyPreview;
  const totalSnippetTokens = items.reduce(
    (sum, item) => sum + estimateTokens(item.snippet),
    0
  );

  return createPortal(
    <div style={styles.overlay} onClick={hideAssemblyPreview}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>Assembly Preview</div>
          <div style={styles.headerMeta}>
            <span>{items.length} item{items.length !== 1 ? 's' : ''} selected</span>
            <span>~{totalSnippetTokens.toLocaleString()} tokens (estimated)</span>
          </div>
        </div>
        <div style={styles.body}>
          {items.map((item, index) => (
            <div key={item.sessionId} style={styles.item}>
              <div style={styles.itemTitle}>
                <span style={styles.itemOrder}>#{index + 1}</span>
                {item.title}
              </div>
              {item.snippet && (
                <div style={styles.itemSnippet}>{item.snippet}</div>
              )}
              <div style={styles.itemMeta}>
                <span>{formatDate(item.timestamp)}</span>
                {item.projectName && (
                  <span style={styles.itemProject}>{item.projectName}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={styles.footer}>
          <button
            style={styles.cancelButton}
            onClick={hideAssemblyPreview}
            onMouseOver={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.color = '#ccc'; }}
            onMouseOut={(e) => { e.target.style.borderColor = '#3a3a5a'; e.target.style.color = '#888'; }}
          >
            Cancel
          </button>
          <button
            style={styles.assembleButton}
            onClick={confirmAssembly}
            onMouseOver={(e) => e.target.style.background = '#047857'}
            onMouseOut={(e) => e.target.style.background = '#059669'}
          >
            Assemble into Inquiry
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default AssemblyPreviewModal;
