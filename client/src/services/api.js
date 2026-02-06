const API_BASE = '/api';

// Track active streaming request for cancellation
let activeStreamController = null;

// Auth token for authenticated requests
let authToken = null;

/**
 * Set the auth token for subsequent requests
 */
export function setAuthToken(token) {
  authToken = token;
}

/**
 * Cancel any active streaming request
 */
export function cancelActiveStream() {
  if (activeStreamController) {
    activeStreamController.abort();
    activeStreamController = null;
  }
}

/**
 * Get common headers including auth token
 */
function getHeaders(customHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return headers;
}

/**
 * Generic fetch wrapper with error handling
 */
async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: getHeaders(options.headers),
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
// Auth
// ============================================

export async function getAuthStatus() {
  return request('/auth/status');
}

export async function login(password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function setupPassword(password) {
  return request('/auth/setup', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function changePassword(currentPassword, newPassword) {
  return request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
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
  if (filters.archived) {
    params.set('archived', 'true');
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

export async function deleteContext(sessionId, contextId) {
  return request(`/sessions/${sessionId}/context/${contextId}`, {
    method: 'DELETE',
  });
}

export async function deleteAllContext(sessionId) {
  return request(`/sessions/${sessionId}/context`, {
    method: 'DELETE',
  });
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

/**
 * Search for sessions similar to a query text (for context surfacing)
 * @param {string} query - Search query
 * @param {string} excludeSessionId - Session to exclude from results
 * @param {number} limit - Max results
 * @param {number} threshold - Minimum similarity score (0-1)
 * @returns {Promise<{results: object[]}>}
 */
export async function searchSimilarSessions(query, excludeSessionId = null, limit = 3, threshold = 0.35) {
  return request('/similarity/search', {
    method: 'POST',
    body: JSON.stringify({ query, excludeSessionId, limit, threshold }),
  });
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
 * @param {object} callbacks - Event callbacks
 * @param {function} callbacks.onChunk - Called with each text chunk
 * @param {function} callbacks.onDone - Called when complete
 * @param {function} callbacks.onError - Called on error
 * @param {function} callbacks.onWarning - Called with warnings (e.g., context truncated)
 * @param {function} callbacks.onSearchStart - Called when web search begins
 * @param {function} callbacks.onSearchComplete - Called when web search completes
 * @param {function} callbacks.onSearchError - Called when web search fails
 * @param {function} callbacks.onSearchDisabled - Called when search is disabled but command detected
 * @param {function} callbacks.onUrlFetchStart - Called when URL fetching begins
 * @param {function} callbacks.onUrlFetchComplete - Called when URL fetching completes
 * @param {function} callbacks.onAbort - Called when request is aborted
 * @returns {AbortController} - Controller to cancel the request
 */
export async function sendMessage(sessionId, content, { onChunk, onDone, onError, onWarning, onSearchStart, onSearchComplete, onSearchError, onSearchDisabled, onUrlFetchStart, onUrlFetchComplete, onAbort }) {
  // Cancel any existing stream
  cancelActiveStream();

  // Create new abort controller for this request
  const controller = new AbortController();
  activeStreamController = controller;

  const response = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ content }),
    signal: controller.signal,
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

      let currentEvent = null;
      for (const line of lines) {
        // Track event type
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
          continue;
        }

        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            // Handle based on current event type
            switch (currentEvent) {
              case 'done':
                activeStreamController = null;
                onDone?.();
                break;
              case 'error':
                activeStreamController = null;
                onError?.(new Error(data.error));
                break;
              case 'warning':
                onWarning?.(data);
                break;
              case 'search_start':
                onSearchStart?.(data);
                break;
              case 'search_complete':
                onSearchComplete?.(data);
                break;
              case 'search_error':
                onSearchError?.(data);
                break;
              case 'search_disabled':
                onSearchDisabled?.(data);
                break;
              case 'url_fetch_start':
                onUrlFetchStart?.(data);
                break;
              case 'url_fetch_complete':
                onUrlFetchComplete?.(data);
                break;
              default:
                // Default data event (streaming content)
                if (data.content) {
                  onChunk?.(data.content);
                }
                // Legacy error/warning handling
                if (data.error) {
                  onError?.(new Error(data.error));
                }
                if (data.type === 'context_truncated') {
                  onWarning?.(data);
                }
            }

            currentEvent = null; // Reset after processing
          } catch (e) {
            // Ignore parse errors for incomplete JSON
          }
        }
      }
    }
  } catch (error) {
    activeStreamController = null;
    // Handle abort gracefully
    if (error.name === 'AbortError') {
      onAbort?.();
      return;
    }
    onError?.(error);
  } finally {
    // Ensure controller is cleared
    if (activeStreamController === controller) {
      activeStreamController = null;
    }
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

/**
 * Import Claude.ai conversation export
 * @param {File} file - The Claude export JSON file
 * @returns {Promise<{success: boolean, imported: number, skipped: number, totalMessages: number, message: string}>}
 */
export async function importClaudeBackup(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/import/claude`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Import failed' }));
    throw new Error(error.error || 'Import failed');
  }

  return response.json();
}

/**
 * Import Markdown files (single .md or .zip archive)
 * @param {File} file - The .md file or .zip archive
 * @returns {Promise<{success: boolean, imported: number, skipped: number, totalMessages: number, message: string}>}
 */
export async function importMarkdown(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/import/markdown`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Import failed' }));
    throw new Error(error.error || 'Import failed');
  }

  return response.json();
}

// ============================================
// Search (Retrieval)
// ============================================

/**
 * Keyword search across sessions and messages
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<object[]>} Search results
 */
export async function searchKeyword(query, options = {}) {
  const params = new URLSearchParams({ q: query });
  if (options.limit) params.set('limit', options.limit);
  if (options.includeAssistant) params.set('include_assistant', 'true');
  if (options.importedOnly) params.set('imported_only', 'true');
  if (options.projectId) params.set('projectId', options.projectId);

  return request(`/search/keyword?${params.toString()}`);
}

/**
 * Search sessions by date range
 * @param {object} options - Search options
 * @returns {Promise<object[]>} Search results
 */
export async function searchByDate(options = {}) {
  const params = new URLSearchParams();
  if (options.startDate) params.set('start_date', options.startDate);
  if (options.endDate) params.set('end_date', options.endDate);
  if (options.importedOnly) params.set('imported_only', 'true');
  if (options.limit) params.set('limit', options.limit);
  if (options.projectId) params.set('projectId', options.projectId);

  return request(`/search/by-date?${params.toString()}`);
}

/**
 * Concept search using semantic similarity
 * @param {string} query - Concept query
 * @param {object} options - Search options
 * @returns {Promise<object[]>} Search results with scores
 */
export async function searchConcept(query, options = {}) {
  const params = new URLSearchParams({ q: query });
  if (options.limit) params.set('limit', options.limit);
  if (options.projectId) params.set('projectId', options.projectId);

  return request(`/search/concept?${params.toString()}`);
}

// ============================================
// Synthesis (Cross-Session Knowledge)
// ============================================

/**
 * Synthesize an answer from multiple sessions
 * @param {string} query - The question to answer
 * @param {object} options - Synthesis options
 * @returns {Promise<{answer: string, sources: object[], query: string, sessionsAnalyzed: number}>}
 */
export async function synthesize(query, options = {}) {
  return request('/synthesize', {
    method: 'POST',
    body: JSON.stringify({ query, ...options }),
  });
}

// ============================================
// Insights (Open Questions, Activity)
// ============================================

/**
 * Get sessions with unresolved edges
 * @param {object} options - Filter options
 * @returns {Promise<{count: number, sessions: object[]}>}
 */
export async function getUnresolvedSessions(options = {}) {
  const params = new URLSearchParams();
  if (options.projectId) params.set('projectId', options.projectId);
  if (options.limit) params.set('limit', options.limit);
  return request(`/insights/unresolved?${params.toString()}`);
}

/**
 * Mark an unresolved edge as resolved
 * @param {string} sessionId - Session to resolve
 * @param {string} resolution - Optional resolution note
 * @returns {Promise<{success: boolean}>}
 */
export async function resolveEdge(sessionId, resolution = null) {
  return request(`/insights/resolve/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify({ resolution }),
  });
}

/**
 * Get activity insights
 * @param {object} options - Options
 * @returns {Promise<object>} Activity data
 */
export async function getActivityInsights(options = {}) {
  const params = new URLSearchParams();
  if (options.months) params.set('months', options.months);
  return request(`/insights/activity?${params.toString()}`);
}

// ============================================
// Export (Data Sovereignty)
// ============================================

/**
 * Get export statistics
 * @returns {Promise<object>} Export stats
 */
export async function getExportStats() {
  return request('/export/stats');
}

/**
 * Export all data as JSON - triggers download
 * @param {boolean} includeEmbeddings - Include embedding vectors
 */
export async function exportAsJson(includeEmbeddings = false) {
  const url = `/api/export/json${includeEmbeddings ? '?includeEmbeddings=true' : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Export failed');

  const blob = await response.blob();
  const filename = `edos-export-${new Date().toISOString().split('T')[0]}.json`;
  downloadBlob(blob, filename);
}

/**
 * Export database - triggers download
 */
export async function exportDatabase() {
  const response = await fetch('/api/export/database');
  if (!response.ok) throw new Error('Export failed');

  const blob = await response.blob();
  const filename = `edos-backup-${new Date().toISOString().split('T')[0]}.db`;
  downloadBlob(blob, filename);
}

/**
 * Export as Markdown - triggers download
 * @param {string[]} sessionIds - Optional specific sessions
 */
export async function exportAsMarkdown(sessionIds = null) {
  const params = sessionIds ? `?sessionIds=${sessionIds.join(',')}` : '';
  const response = await fetch(`/api/export/markdown${params}`);
  if (!response.ok) throw new Error('Export failed');

  const blob = await response.blob();
  const contentDisposition = response.headers.get('Content-Disposition');
  const filename = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || 'edos-export.zip';
  downloadBlob(blob, filename);
}

/**
 * Export single session as Markdown
 * @param {string} sessionId - Session ID
 */
export async function exportSessionAsMarkdown(sessionId) {
  const response = await fetch(`/api/export/session/${sessionId}/markdown`);
  if (!response.ok) throw new Error('Export failed');

  const blob = await response.blob();
  const contentDisposition = response.headers.get('Content-Disposition');
  const filename = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || 'session.md';
  downloadBlob(blob, filename);
}

/**
 * Helper to trigger download
 */
function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
