const API_BASE = '/api';

/**
 * Generic fetch wrapper with error handling
 */
async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// ============================================
// Health
// ============================================

export async function getHealth() {
  return request('/health');
}

// ============================================
// Model Profiles
// ============================================

export async function getProfiles() {
  return request('/profiles');
}

export async function getActiveProfile() {
  return request('/profiles/active');
}

export async function createProfile(profile) {
  return request('/profiles', {
    method: 'POST',
    body: JSON.stringify(profile),
  });
}

export async function updateProfile(id, updates) {
  return request(`/profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function activateProfile(id) {
  return request(`/profiles/${id}/activate`, {
    method: 'POST',
  });
}

export async function deleteProfile(id) {
  return request(`/profiles/${id}`, {
    method: 'DELETE',
  });
}

// ============================================
// Sessions
// ============================================

export async function getSessions() {
  return request('/sessions');
}

export async function getSession(id) {
  return request(`/sessions/${id}`);
}

export async function createSession() {
  return request('/sessions', {
    method: 'POST',
  });
}

export async function deleteSession(id) {
  return request(`/sessions/${id}`, {
    method: 'DELETE',
  });
}

export async function getSessionMessages(sessionId) {
  return request(`/sessions/${sessionId}/messages`);
}

/**
 * Export session as PDF - triggers download
 * @param {string} sessionId
 */
export async function exportSessionPdf(sessionId) {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/export/pdf`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Export failed' }));
    throw new Error(error.error || 'Export failed');
  }

  // Get filename from Content-Disposition header
  const disposition = response.headers.get('Content-Disposition');
  let filename = 'EDOS_export.pdf';
  if (disposition) {
    const match = disposition.match(/filename="([^"]+)"/);
    if (match) {
      filename = match[1];
    }
  }

  // Convert response to blob and trigger download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ============================================
// Messages (Streaming)
// ============================================

/**
 * Send a message and receive streaming response via SSE
 * @param {string} sessionId
 * @param {string} content
 * @param {function} onChunk - Called with each text chunk
 * @param {function} onDone - Called when complete
 * @param {function} onError - Called on error
 * @param {function} onWarning - Called with warnings (e.g., context truncated)
 */
export async function sendMessage(sessionId, content, { onChunk, onDone, onError, onWarning }) {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              onChunk?.(data.content);
            }
          } catch (e) {
            // Ignore parse errors for incomplete JSON
          }
        } else if (line.startsWith('event: done')) {
          onDone?.();
        } else if (line.startsWith('event: error')) {
          // Next line will have the error data
        } else if (line.startsWith('event: warning')) {
          // Next line will have the warning data
        } else if (line.includes('"error"')) {
          try {
            const data = JSON.parse(line.slice(6));
            onError?.(new Error(data.error));
          } catch (e) {
            // Ignore
          }
        } else if (line.includes('"type":"context_truncated"')) {
          onWarning?.({ type: 'context_truncated' });
        }
      }
    }
  } catch (error) {
    onError?.(error);
  }
}
