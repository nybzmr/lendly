/**
 * Escapes special regex characters so user input can be used safely in a RegExp.
 * @param {string} str
 * @returns {string}
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default escapeRegex;
