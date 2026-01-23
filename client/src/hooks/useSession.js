import { useAppStore } from '../store/appStore';

/**
 * Hook for session-related operations
 * Provides convenient access to session state and actions
 */
export function useSession() {
  const {
    sessions,
    activeSessionId,
    selectSession,
    createSession,
    deleteSession,
    loadSessions,
  } = useAppStore();

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return {
    sessions,
    activeSession,
    activeSessionId,
    selectSession,
    createSession,
    deleteSession,
    refreshSessions: loadSessions,
  };
}
