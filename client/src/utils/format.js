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

/**
 * Derives overdue, due-today, and expired states for a booking.
 * @param {Object} booking
 * @returns {{ overdueDays: number, dueToday: boolean, expired: boolean }}
 */
export function getBookingTiming(booking) {
  if (!booking || !booking.endDate) {
    return { overdueDays: 0, dueToday: false, expired: false };
  }
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(booking.endDate).toISOString().slice(0, 10);

  let overdueDays = 0;
  if (booking.status === 'accepted' && end < today) {
    const msDiff = new Date(`${today}T00:00:00.000Z`).getTime() - new Date(`${end}T00:00:00.000Z`).getTime();
    overdueDays = Math.round(msDiff / 86400000);
  }

  const dueToday = booking.status === 'accepted' && end === today;
  const expired = booking.status === 'pending' && end < today;

  return { overdueDays, dueToday, expired };
}
