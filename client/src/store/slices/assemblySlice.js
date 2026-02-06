/**
 * Assembly Slice - Context assembly mode, preview modal
 */
import * as api from '../../services/api';

export const createAssemblySlice = (set, get) => ({
  // State
  contextAssemblyMode: false,
  selectedForAssembly: [],
  assemblyPreview: null, // { items: [], source: 'search' | 'assembly' }

  // Actions
  setContextAssemblyMode: (enabled) => set({
    contextAssemblyMode: enabled,
    selectedForAssembly: [],
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

  assembleFromSearch: () => {
    const { searchSelections, searchResults, projects } = get();
    if (searchSelections.length < 1) return;

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
});
