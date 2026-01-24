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
// Projects
// ============================================

export async function getProjects() {
  return request('/projects');
}

export async function createProject(data) {
  return request('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProject(id, updates) {
  return request(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteProject(id) {
  return request(`/projects/${id}`, {
    method: 'DELETE',
  });
}

// ============================================
// Sessions
// ============================================

export async function getSessions(filters = {}) {
  const params = new URLSearchParams();
  if (filters.project !== undefined) {
    params.set('project', filters.project);
  }
  if (filters.hasDocuments) {
    params.set('hasDocuments', 'true');
  }
  const query = params.toString();
  return request(`/sessions${query ? `?${query}` : ''}`);
}

export async function getSession(id) {
  return request(`/sessions/${id}`);
}

export async function createSession(options = {}) {
  return request('/sessions', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

export async function deleteSession(id) {
  return request(`/sessions/${id}`, {
    method: 'DELETE',
  });
}

export async function updateSession(id, updates) {
  return request(`/sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function getSessionMessages(sessionId) {
  return request(`/sessions/${sessionId}/messages`);
}

/**
 * Upload a file and add it to an inquiry session
 * @param {File} file - The file to upload
 * @param {string} [sessionId] - Optional session ID to add document to
 * @returns {Promise<{session: object, isNewSession: boolean, context: object}>}
 */
export async function uploadFile(file, sessionId = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (sessionId) {
    formData.append('sessionId', sessionId);
  }

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
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
// Anchors
// ============================================

export async function getAnchors(sessionId) {
  return request(`/sessions/${sessionId}/anchors`);
}

export async function createAnchor(sessionId, messageId, label) {
  return request(`/sessions/${sessionId}/anchors`, {
    method: 'POST',
    body: JSON.stringify({ messageId, label }),
  });
}

export async function deleteAnchor(sessionId, anchorId) {
  return request(`/sessions/${sessionId}/anchors/${anchorId}`, {
    method: 'DELETE',
  });
}

// ============================================
// Similarity / Semantic Search
// ============================================

export async function getSimilarSessions(sessionId, limit = 5) {
  return request(`/similarity/sessions/${sessionId}?limit=${limit}`);
}

export async function getSimilarDocuments(sessionId, limit = 5) {
  return request(`/similarity/documents/${sessionId}?limit=${limit}`);
}

// ============================================
// Inquiry Links (Longitudinal Continuity)
// ============================================

/**
 * Get all inquiry links for a session (incoming and outgoing)
 * @param {string} sessionId
 * @returns {Promise<{incoming: object[], outgoing: object[]}>}
 */
export async function getInquiryLinks(sessionId) {
  return request(`/inquiry-links/${sessionId}`);
}

/**
 * Get the ancestor chain for a session (oldest first)
 * @param {string} sessionId
 * @returns {Promise<object[]>}
 */
export async function getAncestorChain(sessionId) {
  return request(`/inquiry-links/${sessionId}/chain`);
}

/**
 * Create an explicit link between two inquiries
 * @param {string} fromSessionId - The source session (earlier in time)
 * @param {string} toSessionId - The destination session (later in time)
 * @param {string} [note] - Optional user note
 * @returns {Promise<object>}
 */
export async function createInquiryLink(fromSessionId, toSessionId, note = null) {
  return request('/inquiry-links', {
    method: 'POST',
    body: JSON.stringify({ fromSessionId, toSessionId, note }),
  });
}

/**
 * Delete an inquiry link
 * @param {string} linkId
 */
export async function deleteInquiryLink(linkId) {
  return request(`/inquiry-links/${linkId}`, {
    method: 'DELETE',
  });
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

// ============================================
// Import (Bulk Conversation Import)
// ============================================

/**
 * Import OpenAI conversations.json backup
 * @param {File} file - The conversations.json file
 * @returns {Promise<{success: boolean, imported: number, skipped: number, totalMessages: number, message: string}>}
 */
export async function importOpenAIBackup(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/import/openai`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Import failed' }));
    throw new Error(error.error || 'Import failed');
  }

  return response.json();
}
