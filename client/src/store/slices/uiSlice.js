/**
 * UI Slice - Panels, modals, loading states, errors
 */

export const createUiSlice = (set, get) => ({
  // State
  isLoading: false,
  error: null,
  leftPanelCollapsed: false,
  sessionSortBy: 'last_active', // 'last_active' or 'created'
  showArchived: false,

  // Actions
  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  setSessionSortBy: (sortBy) => set({ sessionSortBy: sortBy }),

  toggleLeftPanel: () => set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),

  toggleShowArchived: () => {
    set((state) => ({ showArchived: !state.showArchived }));
    // Trigger session reload after state update
    setTimeout(() => get().loadSessions(), 0);
  },
});
