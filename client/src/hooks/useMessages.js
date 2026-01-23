import { useAppStore } from '../store/appStore';

/**
 * Hook for message-related operations
 * Provides convenient access to message state and actions
 */
export function useMessages() {
  const {
    messages,
    isStreaming,
    streamingContent,
    sendMessage,
    contextTruncated,
  } = useAppStore();

  return {
    messages,
    isStreaming,
    streamingContent,
    sendMessage,
    contextTruncated,
  };
}
