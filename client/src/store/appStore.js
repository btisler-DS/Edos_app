/**
 * EDOS Application Store
 *
 * Combines all slices into a single Zustand store.
 * Each slice manages a specific domain of the application.
 */
import { create } from 'zustand';
import { createUiSlice } from './slices/uiSlice';
import { createSessionSlice } from './slices/sessionSlice';
import { createSearchSlice } from './slices/searchSlice';
import { createAssemblySlice } from './slices/assemblySlice';
import { createAuthSlice } from './slices/authSlice';

/**
 * Combined store that merges all slices.
 *
 * Slices:
 * - authSlice: Authentication state and actions
 * - uiSlice: Loading states, errors, panel visibility, sort preferences
 * - sessionSlice: Sessions, messages, anchors, documents, profiles, projects
 * - searchSlice: Retrieve mode, search functionality
 * - assemblySlice: Context assembly mode, preview modal
 */
export const useAppStore = create((set, get) => ({
  // Merge all slices
  ...createAuthSlice(set, get),
  ...createUiSlice(set, get),
  ...createSessionSlice(set, get),
  ...createSearchSlice(set, get),
  ...createAssemblySlice(set, get),
}));

// Export individual slice creators for testing or standalone use
export {
  createAuthSlice,
  createUiSlice,
  createSessionSlice,
  createSearchSlice,
  createAssemblySlice,
};
