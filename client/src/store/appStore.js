import { create } from 'zustand';
import * as api from '../services/api';

export const useAppStore = create((set, get) => ({
  // State
  sessions: [],
  activeSessionId: null,
  messages: [],
  anchors: [],
  documents: [], // Attached documents for active session
  activeProfile: null,
  isLoading: false,
  isStreaming: false,
  streamingContent: '',
  error: null,
  contextTruncated: false,
  sessionSortBy: 'last_active', // 'last_active' or 'created'
  leftPanelCollapsed: false,

  // Projects
  projects: [],
  selectedProjectFilter: null, // null = all, 'unassigned', or project_id
  filterHasDocuments: false,

  // Related Sessions (semantic similarity)
  relatedSessions: [],
  relatedSessionsLoading: false,

  // Context Assembly Mode
  contextAssemblyMode: false,
  selectedForAssembly: [], // Array of session IDs

  // Actions
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  setSessionSortBy: (sortBy) => set({ sessionSortBy: sortBy }),
  toggleLeftPanel: () => set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),
  setProjectFilter: (projectId) => set({ selectedProjectFilter: projectId }),
  setFilterHasDocuments: (value) => set({ filterHasDocuments: value }),

  // Load initial data
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

  // Projects
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

  deleteProject: async (projectId) => {
    try {
      await api.deleteProject(projectId);
      await get().loadProjects();
      await get().loadSessions();
      // Reset filter if we deleted the filtered project
      if (get().selectedProjectFilter === projectId) {
        set({ selectedProjectFilter: null });
      }
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

  // Sessions
  loadSessions: async () => {
    try {
      const { selectedProjectFilter, filterHasDocuments } = get();
      const filters = {};
      if (selectedProjectFilter !== null) {
        filters.project = selectedProjectFilter;
      }
      if (filterHasDocuments) {
        filters.hasDocuments = true;
      }
      const sessions = await api.getSessions(filters);
      set({ sessions });
    } catch (error) {
      set({ error: error.message });
    }
  },

  selectSession: async (sessionId) => {
    set({ isLoading: true, error: null, contextTruncated: false });
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
      // Load related sessions in background (non-blocking)
      get().loadRelatedSessions(sessionId);
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

  // Messages
  sendMessage: async (content) => {
    let { activeSessionId } = get();

    // Auto-create session if none active (ChatGPT-style UX)
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
    }));

    try {
      await api.sendMessage(activeSessionId, content, {
        onChunk: (chunk) => {
          set((state) => ({
            streamingContent: state.streamingContent + chunk,
          }));
        },
        onDone: () => {
          const { streamingContent, messages } = get();
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
          });
          // Refresh sessions to get updated title
          get().loadSessions();
        },
        onError: (error) => {
          set({
            error: error.message,
            isStreaming: false,
            streamingContent: '',
          });
        },
        onWarning: (warning) => {
          if (warning.type === 'context_truncated') {
            set({ contextTruncated: true });
          }
        },
      });
    } catch (error) {
      set({
        error: error.message,
        isStreaming: false,
        streamingContent: '',
      });
    }
  },

  // Profiles
  loadActiveProfile: async () => {
    try {
      const profile = await api.getActiveProfile();
      set({ activeProfile: profile });
    } catch (error) {
      set({ error: error.message });
    }
  },

  // Anchors
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

  // Related Sessions (semantic similarity)
  loadRelatedSessions: async (sessionId) => {
    set({ relatedSessionsLoading: true });
    try {
      const results = await api.getSimilarSessions(sessionId, 5);
      set({ relatedSessions: results, relatedSessionsLoading: false });
    } catch (error) {
      // Silently fail - related sessions are optional
      console.error('Failed to load related sessions:', error);
      set({ relatedSessions: [], relatedSessionsLoading: false });
    }
  },

  clearRelatedSessions: () => set({ relatedSessions: [], relatedSessionsLoading: false }),

  // Context Assembly Mode
  setContextAssemblyMode: (enabled) => set({
    contextAssemblyMode: enabled,
    selectedForAssembly: [], // Clear on toggle
  }),

  toggleSessionForAssembly: (sessionId) => set((state) => ({
    selectedForAssembly: state.selectedForAssembly.includes(sessionId)
      ? state.selectedForAssembly.filter((id) => id !== sessionId)
      : [...state.selectedForAssembly, sessionId],
  })),

  clearAssemblySelection: () => set({ selectedForAssembly: [] }),

  composeFromAssembly: async () => {
    const { selectedForAssembly } = get();
    if (selectedForAssembly.length < 2) return;

    set({ isLoading: true });
    try {
      const session = await api.createSession({ contextFromSessions: selectedForAssembly });
      // Reset assembly mode first
      set({
        contextAssemblyMode: false,
        selectedForAssembly: [],
      });
      // Then properly select the new session (this loads all session data)
      await get().selectSession(session.id);
      // Refresh sessions list
      await get().loadSessions();
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
