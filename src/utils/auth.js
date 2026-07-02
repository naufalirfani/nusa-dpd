/**
 * Auth helpers shared across components.
 */

/**
 * Decode the payload segment of a JWT without verifying the signature.
 * @param {string} token
 * @returns {object} Parsed payload or empty object
 */
export function parseJwtPayload(token) {
  try {
    if (!token) return {};
    const parts = token.split(".");
    if (parts.length < 2) return {};
    const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = payloadB64.length % 4 === 0 ? 0 : 4 - (payloadB64.length % 4);
    const padded = payloadB64 + "=".repeat(pad);
    const json = atob(padded);
    return JSON.parse(json || "{}");
  } catch (e) {
    return {};
  }
}

/**
 * Resolve the currently logged-in user's NIP from the stored JWT token.
 * @returns {string} NIP or empty string when unavailable
 */
export function getCurrentUserNip() {
  const token = localStorage.getItem("token");
  const payload = parseJwtPayload(token) || {};
  return String(payload.nip || payload.preferred_username || "").trim();
}
