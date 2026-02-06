/**
 * Search Slice - Retrieve mode, search functionality
 */
import * as api from '../../services/api';

export const createSearchSlice = (set, get) => ({
  // State
  retrieveMode: false,
  searchType: 'keyword', // 'keyword', 'date', 'concept'
  searchQuery: '',
  searchStartDate: null,
  searchEndDate: null,
  searchResults: [],
  searchLoading: false,
  searchSelections: [],

  // Actions
  setRetrieveMode: (enabled) => set({
    retrieveMode: enabled,
    searchResults: enabled ? get().searchResults : [],
    searchSelections: [],
  }),

  setSearchType: (type) => set({
    searchType: type,
    searchResults: [],
    searchSelections: [],
  }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSearchDateRange: (startDate, endDate) => set({
    searchStartDate: startDate,
    searchEndDate: endDate,
  }),

  performSearch: async () => {
    const { searchType, searchQuery, searchStartDate, searchEndDate, selectedProjectFilter } = get();
    set({ searchLoading: true, searchResults: [], searchSelections: [] });

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
});
