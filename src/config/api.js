/**
 * API Configuration
 * 
 * In development (VITE_DEV=true), uses Vite proxy (relative paths like /cmb, /dpd-portal)
 * In production (VITE_DEV=false), uses direct absolute URLs to avoid needing nginx/apache proxy
 */

const isDev = import.meta.env.VITE_DEV === 'true';

// Base URLs for production (direct API calls)
const CMB_BASE = import.meta.env.VITE_CMB_BASE || 'http://localhost:8000';
const DPD_PORTAL_BASE = import.meta.env.VITE_DPD_BASE || 'https://okk.dpd.go.id';
const DAYOFF_API_BASE = import.meta.env.VITE_DAYOFF_API_BASE || 'https://dayoffapi.vercel.app/api';

/**
 * Get the full URL for CMB/SSO API endpoints
 * @param {string} path - API path (e.g., '/sso/generate/123')
 * @returns {string} Full URL
 */
export function getCmbApiUrl(path) {
  if (isDev) {
    // In development, use Vite proxy
    return `/cmb${path}`;
  }
  // In production, use direct URL
  return `${CMB_BASE}${path}`;
}

/**
 * Get the full URL for DPD Portal API endpoints
 * @param {string} path - API path (e.g., '/dpd-portal/openapi/...')
 * @returns {string} Full URL
 */
export function getDpdPortalApiUrl(path) {
  if (isDev) {
    // In development, use Vite proxy (already includes /dpd-portal prefix)
    return path;
  }
  // In production, use direct URL
  return `${DPD_PORTAL_BASE}${path}`;
}

/**
 * Get the full URL for Day Off API endpoints
 * @param {string} path - API path (e.g., '/id/2025')
 * @returns {string} Full URL
 */
export function getDayOffApiUrl(path) {
  if (isDev) {
    // In development, use Vite proxy
    return `/dayoffapi${path}`;
  }
  // In production, use direct URL
  return `${DAYOFF_API_BASE}${path}`;
}

/**
 * Check if running in development mode
 * @returns {boolean}
 */
export function isDevMode() {
  return isDev;
}

export default {
  getCmbApiUrl,
  getDpdPortalApiUrl,
  getDayOffApiUrl,
  isDevMode,
};
