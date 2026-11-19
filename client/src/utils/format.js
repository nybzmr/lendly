/**
 * Formats a number as INR with the rupee symbol.
 * @param {number|string} n
 * @returns {string}
 */
export function formatINR(n) {
  if (n === null || n === undefined || isNaN(Number(n))) return '₹0';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

/**
 * Formats a date string or object into a human-readable date.
 * @param {string|Date} d
 * @returns {string}
 */
export function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Returns image path if valid non-empty string, else null.
 * @param {string} path
 * @returns {string|null}
 */
export function imageSrc(path) {
  if (!path || typeof path !== 'string' || !path.trim()) return null;
  return path.trim();
}
