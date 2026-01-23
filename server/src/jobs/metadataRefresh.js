import { SessionService } from '../services/SessionService.js';
import { MetadataService } from '../services/MetadataService.js';
import { INACTIVITY_THRESHOLD_MS, METADATA_REFRESH_INTERVAL_MS } from '../config/constants.js';

let intervalId = null;

/**
 * Run a single metadata refresh cycle
 */
async function refreshCycle() {
  try {
    const sessions = SessionService.getSessionsNeedingMetadata(INACTIVITY_THRESHOLD_MS);

    if (sessions.length === 0) {
      return;
    }

    console.log(`[MetadataRefresh] Found ${sessions.length} sessions needing metadata`);

    for (const session of sessions) {
      try {
        console.log(`[MetadataRefresh] Generating metadata for session: ${session.id}`);
        await MetadataService.generateForSession(session.id);
        console.log(`[MetadataRefresh] Completed metadata for session: ${session.id}`);
      } catch (error) {
        console.error(`[MetadataRefresh] Failed for session ${session.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('[MetadataRefresh] Cycle failed:', error.message);
  }
}

/**
 * Start the metadata refresh background job
 */
export function startMetadataRefreshJob() {
  if (intervalId) {
    console.warn('[MetadataRefresh] Job already running');
    return;
  }

  console.log(`[MetadataRefresh] Starting job (interval: ${METADATA_REFRESH_INTERVAL_MS / 1000}s, threshold: ${INACTIVITY_THRESHOLD_MS / 60000}min)`);

  // Run immediately on start, then at interval
  refreshCycle();
  intervalId = setInterval(refreshCycle, METADATA_REFRESH_INTERVAL_MS);
}

/**
 * Stop the metadata refresh background job
 */
export function stopMetadataRefreshJob() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[MetadataRefresh] Job stopped');
  }
}
