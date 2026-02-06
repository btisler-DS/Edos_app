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

/**
 * Format a timestamp as relative time (e.g., "3 days ago", "2 months ago")
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} Relative time string
 */
export function formatRelativeTime(timestamp) {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return years === 1 ? '1 year ago' : `${years} years ago`;
  if (months > 0) return months === 1 ? '1 month ago' : `${months} months ago`;
  if (weeks > 0) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  if (days > 0) return days === 1 ? '1 day ago' : `${days} days ago`;
  if (hours > 0) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  if (minutes > 0) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  return 'just now';
}
