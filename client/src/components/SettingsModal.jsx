import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import * as api from '../services/api';

const AVAILABLE_MODELS = {
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  ],
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#1a1a2e',
    borderRadius: '12px',
    border: '1px solid #2a2a4a',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #2a2a4a',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#fff',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#888',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
  },
  content: {
    padding: '20px',
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
  label: {
    display: 'block',
    fontSize: '13px',
    color: '#888',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: '#12122a',
    border: '1px solid #3a3a5a',
    borderRadius: '6px',
    color: '#eee',
    fontSize: '14px',
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    background: '#12122a',
    border: '1px solid #3a3a5a',
    borderRadius: '6px',
    color: '#eee',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    background: '#12122a',
    border: '1px solid #3a3a5a',
    borderRadius: '6px',
    color: '#eee',
    fontSize: '14px',
    outline: 'none',
    minHeight: '150px',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.5,
  },
  row: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
  },
  col: {
    flex: 1,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderTop: '1px solid #2a2a4a',
    gap: '12px',
  },
  button: {
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  primaryButton: {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
  },
  secondaryButton: {
    background: 'transparent',
    color: '#888',
    border: '1px solid #3a3a5a',
  },
  hint: {
    fontSize: '12px',
    color: '#666',
    marginTop: '6px',
  },
  identityBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    background: '#1e293b',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#4ade80',
  },
  error: {
    color: '#f87171',
    fontSize: '13px',
    marginTop: '8px',
  },
  success: {
    color: '#4ade80',
    fontSize: '13px',
    marginTop: '8px',
  },
};

function SettingsModal({ isOpen, onClose }) {
  const { activeProfile, loadActiveProfile } = useAppStore();
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'anthropic',
    model_id: '',
    system_prompt: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Load profiles on mount
  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen]);

  // Update form when active profile changes
  useEffect(() => {
    if (activeProfile) {
      setSelectedProfileId(activeProfile.id);
      setFormData({
        name: activeProfile.name || '',
        provider: activeProfile.provider || 'anthropic',
        model_id: activeProfile.model_id || '',
        system_prompt: activeProfile.system_prompt || '',
      });
    }
  }, [activeProfile]);

  const loadProfiles = async () => {
    try {
      const data = await api.getProfiles();
      setProfiles(data);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  const handleProfileSelect = (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setSelectedProfileId(profileId);
      setFormData({
        name: profile.name || '',
        provider: profile.provider || 'anthropic',
        model_id: profile.model_id || '',
        system_prompt: profile.system_prompt || '',
      });
    }
  };

  const handleProviderChange = (provider) => {
    const models = AVAILABLE_MODELS[provider];
    setFormData(prev => ({
      ...prev,
      provider,
      model_id: models[0]?.id || '',
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      if (selectedProfileId) {
        // Update existing profile
        await api.updateProfile(selectedProfileId, {
          name: formData.name,
          provider: formData.provider,
          model_id: formData.model_id,
          system_prompt: formData.system_prompt,
        });

        // Ensure it's active
        await api.activateProfile(selectedProfileId);
      }

      await loadActiveProfile();
      await loadProfiles();
      setMessage({ type: 'success', text: 'Settings saved successfully' });

      // Auto-close after success
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 2000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const availableModels = AVAILABLE_MODELS[formData.provider] || [];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>EDOS Settings</span>
          <button style={styles.closeButton} onClick={onClose}>&times;</button>
        </div>

        <div style={styles.content}>
          {/* Identity Section */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Identity</div>
            <div style={styles.identityBadge}>
              <span style={{ width: 8, height: 8, background: '#4ade80', borderRadius: '50%' }} />
              EDOS Identity Locked
            </div>
            <p style={styles.hint}>
              EDOS maintains a consistent identity. The system prompt below defines how EDOS behaves.
            </p>
          </div>

          {/* Model Configuration */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Model Configuration</div>

            <div style={styles.row}>
              <div style={styles.col}>
                <label style={styles.label}>Profile Name</label>
                <input
                  style={styles.input}
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., EDOS Default"
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.col}>
                <label style={styles.label}>Provider</label>
                <select
                  style={styles.select}
                  value={formData.provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                >
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>
              <div style={styles.col}>
                <label style={styles.label}>Model</label>
                <select
                  style={styles.select}
                  value={formData.model_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, model_id: e.target.value }))}
                >
                  {availableModels.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>System Prompt</div>
            <textarea
              style={styles.textarea}
              value={formData.system_prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
              placeholder="Define EDOS's behavior and personality..."
            />
            <p style={styles.hint}>
              Changes apply to new messages only. Existing conversations retain their original context.
            </p>
          </div>

          {message.text && (
            <div style={message.type === 'error' ? styles.error : styles.success}>
              {message.text}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button
            style={{ ...styles.button, ...styles.secondaryButton }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={{ ...styles.button, ...styles.primaryButton, opacity: saving ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
