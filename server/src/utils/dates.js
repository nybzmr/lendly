/**
 * Parse a 'YYYY-MM-DD' string to a Date at UTC midnight.
 * Returns null if the string is missing or invalid.
 * @param {string} str
 * @returns {Date|null}
 */
export function parseDateOnly(str) {
  if (!str || typeof str !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(`${str}T00:00:00.000Z`);
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Returns today's date at UTC midnight.
 * @returns {Date}
 */
export function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Counts the number of inclusive days between two UTC-midnight Dates.
 * Assumes a <= b.
 * @param {Date} a
 * @param {Date} b
 * @returns {number}
 */
export function daysInclusive(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86400000) + 1;
}
