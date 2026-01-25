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

  // Archive view toggle
  showArchived: false,

  // Related Sessions (semantic similarity)
  relatedSessions: [],
  relatedSessionsLoading: false,

  // Inquiry Links (longitudinal continuity)
  inquiryLinks: { incoming: [], outgoing: [] },
  ancestorChain: [],

  // Context Assembly Mode
  contextAssemblyMode: false,
  selectedForAssembly: [], // Array of session IDs

  // Retrieve Mode (search and assembly)
  retrieveMode: false,
  searchType: 'keyword', // 'keyword', 'date', 'concept'
  searchQuery: '',
  searchStartDate: null,
  searchEndDate: null,
  searchResults: [],
  searchLoading: false,
  searchSelections: [], // Array of session IDs selected from search results

  // Actions
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  setSessionSortBy: (sortBy) => set({ sessionSortBy: sortBy }),
  toggleLeftPanel: () => set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),
  setProjectFilter: (projectId) => set({ selectedProjectFilter: projectId }),
  setFilterHasDocuments: (value) => set({ filterHasDocuments: value }),

  // Session control actions (pin, archive, rename)
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

  toggleShowArchived: () => {
    set((state) => ({ showArchived: !state.showArchived }));
    setTimeout(() => get().loadSessions(), 0);
  },

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
      // Load related sessions and inquiry links in background (non-blocking)
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

  // Inquiry Links (longitudinal continuity)
  loadInquiryLinks: async (sessionId) => {
    try {
      const [links, chain] = await Promise.all([
        api.getInquiryLinks(sessionId),
        api.getAncestorChain(sessionId),
      ]);
      set({ inquiryLinks: links, ancestorChain: chain });
    } catch (error) {
      // Silently fail - inquiry links are optional
      console.error('Failed to load inquiry links:', error);
      set({ inquiryLinks: { incoming: [], outgoing: [] }, ancestorChain: [] });
    }
  },

  clearInquiryLinks: () => set({ inquiryLinks: { incoming: [], outgoing: [] }, ancestorChain: [] }),

  /**
   * Continue an inquiry by creating a new session linked structurally to the given session.
   * No context is assembled - this is structural continuity only.
   */
  continueInquiry: async (fromSessionId) => {
    set({ isLoading: true });
    try {
      const session = await api.createSession({ continuedFromSessionId: fromSessionId });
      // Select the new session
      await get().selectSession(session.id);
      // Refresh sessions list
      await get().loadSessions();
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Context Management (remove/clear assembled items)
  removeContext: async (contextId) => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;
    try {
      await api.deleteContext(activeSessionId, contextId);
      // Refresh session to update documents list
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

  composeFromAssembly: () => {
    const { selectedForAssembly, sessions, projects } = get();
    if (selectedForAssembly.length < 2) return;

    // Build preview items from selected sessions
    const items = selectedForAssembly.map(id => {
      const session = sessions.find(s => s.id === id);
      const project = session?.project_id ? projects.find(p => p.id === session.project_id) : null;
      return {
        sessionId: id,
        title: session?.title || 'Untitled Inquiry',
        timestamp: session?.last_active_at || session?.created_at,
        snippet: session?.first_assistant_snippet || '',
        projectId: session?.project_id || null,
        projectName: project?.name || null,
      };
    });

    get().showAssemblyPreview(items, 'assembly');
  },

  // Import
  importStatus: null, // { importing: boolean, result: object | null }

  importOpenAIBackup: async (file) => {
    set({ importStatus: { importing: true, result: null } });
    try {
      const result = await api.importOpenAIBackup(file);
      set({ importStatus: { importing: false, result } });
      // Refresh sessions list to show imported sessions
      await get().loadSessions();
      return result;
    } catch (error) {
      set({ importStatus: { importing: false, result: { error: error.message } }, error: error.message });
      throw error;
    }
  },

  clearImportStatus: () => set({ importStatus: null }),

  // Assembly Preview
  assemblyPreview: null, // { items: [], source: 'search' | 'assembly' } when modal open

  showAssemblyPreview: (items, source) => set({ assemblyPreview: { items, source } }),
  hideAssemblyPreview: () => set({ assemblyPreview: null }),

  confirmAssembly: async () => {
    const { assemblyPreview } = get();
    if (!assemblyPreview) return;

    const sessionIds = assemblyPreview.items.map(i => i.sessionId);
    set({ isLoading: true, assemblyPreview: null });

    try {
      const session = await api.createSession({ contextFromSessions: sessionIds });
      // Reset modes
      set({
        contextAssemblyMode: false,
        selectedForAssembly: [],
        retrieveMode: false,
        searchResults: [],
        searchSelections: [],
      });
      await get().selectSession(session.id);
      await get().loadSessions();
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Retrieve Mode Actions
  setRetrieveMode: (enabled) => set({
    retrieveMode: enabled,
    searchResults: enabled ? get().searchResults : [],
    searchSelections: [],
  }),

  setSearchType: (type) => set({ searchType: type, searchResults: [], searchSelections: [] }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSearchDateRange: (startDate, endDate) => set({
    searchStartDate: startDate,
    searchEndDate: endDate,
  }),

  performSearch: async () => {
    const { searchType, searchQuery, searchStartDate, searchEndDate, selectedProjectFilter } = get();
    set({ searchLoading: true, searchResults: [], searchSelections: [] });

    // Pass project filter to search if set
    const projectId = selectedProjectFilter || undefined;

    try {
      let results = [];

      if (searchType === 'keyword') {
        if (!searchQuery.trim()) {
          set({ searchLoading: false });
          return;
        }
        results = await api.searchKeyword(searchQuery, { limit: 25, projectId });
      } else if (searchType === 'date') {
        results = await api.searchByDate({
          startDate: searchStartDate,
          endDate: searchEndDate,
          limit: 25,
          projectId,
        });
      } else if (searchType === 'concept') {
        if (!searchQuery.trim()) {
          set({ searchLoading: false });
          return;
        }
        results = await api.searchConcept(searchQuery, { limit: 25, projectId });
      }

      set({ searchResults: results, searchLoading: false });
    } catch (error) {
      console.error('Search failed:', error);
      set({ error: error.message, searchLoading: false });
    }
  },

  toggleSearchSelection: (sessionId) => set((state) => ({
    searchSelections: state.searchSelections.includes(sessionId)
      ? state.searchSelections.filter((id) => id !== sessionId)
      : [...state.searchSelections, sessionId],
  })),

  clearSearchSelections: () => set({ searchSelections: [] }),

  clearSearchResults: () => set({
    searchResults: [],
    searchSelections: [],
    searchQuery: '',
    searchStartDate: null,
    searchEndDate: null,
  }),

  assembleFromSearch: () => {
    const { searchSelections, searchResults, projects } = get();
    if (searchSelections.length < 1) return;

    // Build preview items from search results
    const items = searchSelections.map(id => {
      const result = searchResults.find(r => r.sessionId === id);
      const project = result?.projectId ? projects.find(p => p.id === result.projectId) : null;
      return {
        sessionId: id,
        title: result?.title || 'Untitled Inquiry',
        timestamp: result?.timestamp,
        snippet: result?.snippet || '',
        projectId: result?.projectId || null,
        projectName: project?.name || null,
      };
    });

    get().showAssemblyPreview(items, 'search');
  },
}));
