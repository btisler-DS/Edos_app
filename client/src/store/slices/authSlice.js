/**
 * Auth Slice - Authentication state and actions
 */
import * as api from '../../services/api';

const TOKEN_KEY = 'edos_auth_token';

export const createAuthSlice = (set, get) => ({
  // State
  isAuthenticated: false,
  authRequired: false,
  authConfigured: false,
  authLoading: true,
  authError: null,

  // Actions

  /**
   * Check auth status on app load
   */
  checkAuthStatus: async () => {
    set({ authLoading: true, authError: null });
    try {
      const status = await api.getAuthStatus();
      const token = localStorage.getItem(TOKEN_KEY);

      // If auth is not enabled and not configured, skip auth
      if (!status.enabled && !status.configured) {
        set({
          isAuthenticated: true,
          authRequired: false,
          authConfigured: false,
          authLoading: false,
        });
        return;
      }

      // Auth is enabled or configured
      set({
        authRequired: status.enabled || status.configured,
        authConfigured: status.configured,
      });

      // If we have a token, validate it
      if (token) {
        api.setAuthToken(token);
        // Try to make an authenticated request to validate token
        try {
          await api.getHealth();
          set({ isAuthenticated: true, authLoading: false });
          return;
        } catch (error) {
          // Token invalid, clear it
          localStorage.removeItem(TOKEN_KEY);
          api.setAuthToken(null);
        }
      }

      set({ isAuthenticated: false, authLoading: false });
    } catch (error) {
      // If we can't reach the server, assume no auth needed (local mode)
      console.error('Auth status check failed:', error);
      set({
        isAuthenticated: true,
        authRequired: false,
        authLoading: false,
      });
    }
  },

  /**
   * Login with password
   */
  login: async (password) => {
    set({ authLoading: true, authError: null });
    try {
      const result = await api.login(password);
      localStorage.setItem(TOKEN_KEY, result.token);
      api.setAuthToken(result.token);
      set({ isAuthenticated: true, authLoading: false, authError: null });
      return true;
    } catch (error) {
      set({ authError: error.message, authLoading: false });
      return false;
    }
  },

  /**
   * Setup initial password
   */
  setupPassword: async (password) => {
    set({ authLoading: true, authError: null });
    try {
      await api.setupPassword(password);
      // After setup, login with the new password
      return await get().login(password);
    } catch (error) {
      set({ authError: error.message, authLoading: false });
      return false;
    }
  },

  /**
   * Logout
   */
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    api.setAuthToken(null);
    set({ isAuthenticated: false });
  },

  /**
   * Clear auth error
   */
  clearAuthError: () => set({ authError: null }),
});
