/**
 * Get current timestamp in ISO format for SQLite
 */
export function now() {
  return new Date().toISOString();
}

/**
 * Check if a timestamp is older than the given threshold
 * @param {string} timestamp - ISO timestamp string
 * @param {number} thresholdMs - Threshold in milliseconds
 */
export function isOlderThan(timestamp, thresholdMs) {
  const then = new Date(timestamp).getTime();
  const nowMs = Date.now();
  return (nowMs - then) >= thresholdMs;
}

/**
 * Get timestamp from N milliseconds ago
 * @param {number} ms - Milliseconds in the past
 */
export function msAgo(ms) {
  return new Date(Date.now() - ms).toISOString();
}
