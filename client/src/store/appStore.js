import { create } from 'zustand';
import * as api from '../services/api';

export const useAppStore = create((set, get) => ({
  // State
  sessions: [],
  activeSessionId: null,
  messages: [],
  activeProfile: null,
  isLoading: false,
  isStreaming: false,
  streamingContent: '',
  error: null,
  contextTruncated: false,

  // Actions
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Load initial data
  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const [sessions, profile] = await Promise.all([
        api.getSessions(),
        api.getActiveProfile().catch(() => null),
      ]);
      set({ sessions, activeProfile: profile, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Sessions
  loadSessions: async () => {
    try {
      const sessions = await api.getSessions();
      set({ sessions });
    } catch (error) {
      set({ error: error.message });
    }
  },

  selectSession: async (sessionId) => {
    set({ isLoading: true, error: null, contextTruncated: false });
    try {
      const messages = await api.getSessionMessages(sessionId);
      set({ activeSessionId: sessionId, messages, isLoading: false });
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
    const { activeSessionId } = get();
    if (!activeSessionId) {
      set({ error: 'No active session' });
      return;
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
}));
