/**
 * Session Slice - Sessions, messages, anchors, documents, profiles, projects
 */
import * as api from '../../services/api';
import { cancelActiveStream } from '../../services/api';

export const createSessionSlice = (set, get) => ({
  // State
  sessions: [],
  activeSessionId: null,
  messages: [],
  anchors: [],
  documents: [],
  activeProfile: null,
  isStreaming: false,
  streamingContent: '',
  contextTruncated: false,

  // Projects
  projects: [],
  selectedProjectFilter: null,
  filterHasDocuments: false,

  // Related Sessions (semantic similarity)
  relatedSessions: [],
  relatedSessionsLoading: false,

  // Inquiry Links (longitudinal continuity)
  inquiryLinks: { incoming: [], outgoing: [] },
  ancestorChain: [],

  // Web Search / URL Fetch State
  isWebSearching: false,
  webSearchQuery: null,
  isUrlFetching: false,
  urlFetchCount: 0,

  // Import Status
  importStatus: null,

  // ==================== Initialization ====================

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const [sessions, profile, projectsData] = await Promise.all([
        api.getSessions(),
        api.getActiveProfile().catch(() => null),
        api.getProjects().catch(() => ({ projects: [], unassignedCount: 0 })),
      ]);
      set({
        sessions,
        activeProfile: profile,
        projects: projectsData.projects || [],
        isLoading: false,
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // ==================== Sessions ====================

  loadSessions: async () => {
    try {
      const { selectedProjectFilter, filterHasDocuments, showArchived } = get();
      const filters = {};
      if (selectedProjectFilter !== null) {
        filters.project = selectedProjectFilter;
      }
      if (filterHasDocuments) {
        filters.hasDocuments = true;
      }
      if (showArchived) {
        filters.archived = true;
      }
      const sessions = await api.getSessions(filters);
      set({ sessions });
    } catch (error) {
      set({ error: error.message });
    }
  },

  selectSession: async (sessionId) => {
    // Cancel any active streaming before switching sessions
    cancelActiveStream();

    set({
      isLoading: true,
      error: null,
      contextTruncated: false,
      isStreaming: false,
      streamingContent: '',
    });

    try {
      const [session, messages, anchors] = await Promise.all([
        api.getSession(sessionId),
        api.getSessionMessages(sessionId),
        api.getAnchors(sessionId),
      ]);
      set({
        activeSessionId: sessionId,
        messages,
        anchors,
        documents: session.documents || [],
        isLoading: false,
      });
      // Load related data in background
      get().loadRelatedSessions(sessionId);
      get().loadInquiryLinks(sessionId);
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  createSession: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await api.createSession();
      const sessions = await api.getSessions();
      set({
        sessions,
        activeSessionId: session.id,
        messages: [],
        isLoading: false,
        contextTruncated: false,
      });
      return session;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteSession: async (sessionId) => {
    try {
      await api.deleteSession(sessionId);
      const { activeSessionId } = get();
      const sessions = await api.getSessions();
      set({
        sessions,
        activeSessionId: activeSessionId === sessionId ? null : activeSessionId,
        messages: activeSessionId === sessionId ? [] : get().messages,
      });
    } catch (error) {
      set({ error: error.message });
    }
  },

  // Session control actions
  pinSession: async (id) => {
    try {
      await api.updateSession(id, { pinned: 1 });
      await get().loadSessions();
    } catch (error) {
      set({ error: error.message });
    }
  },

  unpinSession: async (id) => {
    try {
      await api.updateSession(id, { pinned: 0 });
      await get().loadSessions();
    } catch (error) {
      set({ error: error.message });
    }
  },

  archiveSession: async (id) => {
    try {
      await api.updateSession(id, { archived: 1 });
      const { activeSessionId } = get();
      if (activeSessionId === id) {
        set({ activeSessionId: null, messages: [] });
      }
      await get().loadSessions();
    } catch (error) {
      set({ error: error.message });
    }
  },

  unarchiveSession: async (id) => {
    try {
      await api.updateSession(id, { archived: 0 });
      await get().loadSessions();
    } catch (error) {
      set({ error: error.message });
    }
  },

  renameSession: async (id, newTitle) => {
    try {
      await api.updateSession(id, { title: newTitle });
      await get().loadSessions();
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  setSessionProject: async (sessionId, projectId) => {
    try {
      await api.updateSession(sessionId, { project_id: projectId });
      await get().loadSessions();
      await get().loadProjects();
    } catch (error) {
      set({ error: error.message });
    }
  },

  // ==================== Messages ====================

  /**
   * Cancel any in-progress message streaming
   */
  cancelMessage: () => {
    cancelActiveStream();
    const { messages } = get();
    // Remove the last message if it was an optimistic user message (temp ID)
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.id?.startsWith('temp-')) {
      set({
        messages: messages.slice(0, -1),
        isStreaming: false,
        streamingContent: '',
        isWebSearching: false,
        webSearchQuery: null,
        isUrlFetching: false,
        urlFetchCount: 0,
      });
    } else {
      set({
        isStreaming: false,
        streamingContent: '',
        isWebSearching: false,
        webSearchQuery: null,
        isUrlFetching: false,
        urlFetchCount: 0,
      });
    }
  },

  sendMessage: async (content) => {
    let { activeSessionId, messages: previousMessages } = get();

    // Auto-create session if none active
    if (!activeSessionId) {
      try {
        const session = await api.createSession();
        const sessions = await api.getSessions();
        set({
          sessions,
          activeSessionId: session.id,
          messages: [],
          contextTruncated: false,
        });
        activeSessionId = session.id;
        previousMessages = [];
      } catch (error) {
        set({ error: 'Failed to create session: ' + error.message });
        return;
      }
    }

    // Add user message optimistically
    const userMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isStreaming: true,
      streamingContent: '',
      error: null,
      contextTruncated: false,
      isWebSearching: false,
      webSearchQuery: null,
      isUrlFetching: false,
      urlFetchCount: 0,
    }));

    try {
      await api.sendMessage(activeSessionId, content, {
        onChunk: (chunk) => {
          set((state) => ({
            streamingContent: state.streamingContent + chunk,
          }));
        },
        onDone: () => {
          const { streamingContent, messages, activeSessionId: sessId } = get();
          const assistantMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: streamingContent,
            created_at: new Date().toISOString(),
          };
          set({
            messages: [...messages, assistantMessage],
            isStreaming: false,
            streamingContent: '',
            isWebSearching: false,
            webSearchQuery: null,
            isUrlFetching: false,
            urlFetchCount: 0,
          });
          get().loadSessions();
          // Refresh documents
          if (sessId) {
            api.getSession(sessId).then(session => {
              set({ documents: session.documents || [] });
            }).catch(() => {});
          }
        },
        onError: (error) => {
          // Rollback optimistic update on error
          set({
            messages: previousMessages,
            error: error.message,
            isStreaming: false,
            streamingContent: '',
            isWebSearching: false,
            webSearchQuery: null,
            isUrlFetching: false,
            urlFetchCount: 0,
          });
        },
        onAbort: () => {
          // User cancelled - rollback optimistic update
          set({
            messages: previousMessages,
            isStreaming: false,
            streamingContent: '',
            isWebSearching: false,
            webSearchQuery: null,
            isUrlFetching: false,
            urlFetchCount: 0,
          });
        },
        onWarning: (warning) => {
          if (warning.type === 'context_truncated') {
            set({ contextTruncated: true });
          }
        },
        onSearchStart: (data) => {
          set({ isWebSearching: true, webSearchQuery: data.query });
        },
        onSearchComplete: () => {
          set({ isWebSearching: false, webSearchQuery: null });
        },
        onSearchError: (data) => {
          console.error('Web search failed:', data.error);
          set({ isWebSearching: false, webSearchQuery: null });
        },
        onSearchDisabled: () => {
          set({ isWebSearching: false, webSearchQuery: null });
        },
        onUrlFetchStart: (data) => {
          set({ isUrlFetching: true, urlFetchCount: data.count });
        },
        onUrlFetchComplete: () => {
          set({ isUrlFetching: false, urlFetchCount: 0 });
        },
      });
    } catch (error) {
      // Handle initial fetch error (before streaming starts)
      if (error.name === 'AbortError') {
        set({
          messages: previousMessages,
          isStreaming: false,
          streamingContent: '',
        });
        return;
      }
      set({
        messages: previousMessages,
        error: error.message,
        isStreaming: false,
        streamingContent: '',
      });
    }
  },

  // ==================== Anchors ====================

  createAnchor: async (messageId, label) => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;

    try {
      const anchor = await api.createAnchor(activeSessionId, messageId, label);
      set((state) => ({ anchors: [...state.anchors, anchor] }));
      return anchor;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteAnchor: async (anchorId) => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;

    try {
      await api.deleteAnchor(activeSessionId, anchorId);
      set((state) => ({
        anchors: state.anchors.filter((a) => a.id !== anchorId),
      }));
    } catch (error) {
      set({ error: error.message });
    }
  },

  // ==================== Related Sessions ====================

  loadRelatedSessions: async (sessionId) => {
    set({ relatedSessionsLoading: true });
    try {
      const results = await api.getSimilarSessions(sessionId, 5);
      set({ relatedSessions: results, relatedSessionsLoading: false });
    } catch (error) {
      console.error('Failed to load related sessions:', error);
      set({ relatedSessions: [], relatedSessionsLoading: false });
    }
  },

  clearRelatedSessions: () => set({ relatedSessions: [], relatedSessionsLoading: false }),

  // ==================== Inquiry Links ====================

  loadInquiryLinks: async (sessionId) => {
    try {
      const [links, chain] = await Promise.all([
        api.getInquiryLinks(sessionId),
        api.getAncestorChain(sessionId),
      ]);
      set({ inquiryLinks: links, ancestorChain: chain });
    } catch (error) {
      console.error('Failed to load inquiry links:', error);
      set({ inquiryLinks: { incoming: [], outgoing: [] }, ancestorChain: [] });
    }
  },

  clearInquiryLinks: () => set({ inquiryLinks: { incoming: [], outgoing: [] }, ancestorChain: [] }),

  continueInquiry: async (fromSessionId) => {
    set({ isLoading: true });
    try {
      const session = await api.createSession({ continuedFromSessionId: fromSessionId });
      await get().selectSession(session.id);
      await get().loadSessions();
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // ==================== Context Management ====================

  removeContext: async (contextId) => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;
    try {
      await api.deleteContext(activeSessionId, contextId);
      const session = await api.getSession(activeSessionId);
      set({ documents: session.documents || [] });
    } catch (error) {
      set({ error: error.message });
    }
  },

  clearAllContext: async () => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;
    try {
      await api.deleteAllContext(activeSessionId);
      set({ documents: [] });
    } catch (error) {
      set({ error: error.message });
    }
  },

  // ==================== Projects ====================

  setProjectFilter: (projectId) => set({ selectedProjectFilter: projectId }),

  setFilterHasDocuments: (value) => set({ filterHasDocuments: value }),

  loadProjects: async () => {
    try {
      const data = await api.getProjects();
      set({ projects: data.projects || [] });
    } catch (error) {
      set({ error: error.message });
    }
  },

  createProject: async (name, description) => {
    try {
      const project = await api.createProject({ name, description });
      await get().loadProjects();
      return project;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  renameProject: async (projectId, name) => {
    try {
      await api.updateProject(projectId, { name });
      await get().loadProjects();
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteProject: async (projectId) => {
    try {
      await api.deleteProject(projectId);
      await get().loadProjects();
      await get().loadSessions();
      if (get().selectedProjectFilter === projectId) {
        set({ selectedProjectFilter: null });
      }
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // ==================== Profiles ====================

  loadActiveProfile: async () => {
    try {
      const profile = await api.getActiveProfile();
      set({ activeProfile: profile });
    } catch (error) {
      set({ error: error.message });
    }
  },

  // ==================== Import ====================

  importOpenAIBackup: async (file) => {
    set({ importStatus: { importing: true, result: null } });
    try {
      const result = await api.importOpenAIBackup(file);
      set({ importStatus: { importing: false, result } });
      await get().loadSessions();
      return result;
    } catch (error) {
      set({ importStatus: { importing: false, result: { error: error.message } }, error: error.message });
      throw error;
    }
  },

  clearImportStatus: () => set({ importStatus: null }),
});
