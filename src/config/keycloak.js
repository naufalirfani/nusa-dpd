/**
 * Keycloak SSO Configuration
 * Handles OAuth 2.0 / OpenID Connect flow with DPD Keycloak server
 * Using keycloak-js library
 */

import Keycloak from 'keycloak-js';

// Keycloak instance
let keycloakInstance = null;
let keycloakInitialized = false;
let initPromise = null;

/**
 * Initialize Keycloak instance
 * @returns {Keycloak} Keycloak instance
 */
export function getKeycloakInstance() {
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak({
      url: import.meta.env.VITE_KEYCLOAK_BASE_URL,
      realm: import.meta.env.VITE_KEYCLOAK_REALM,
      clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    });
  }
  return keycloakInstance;
}

/**
 * Initialize Keycloak authentication
 * @param {Object} options - Init options
 * @returns {Promise<boolean>} True if authenticated
 */
export async function initKeycloak(options = {}) {
  const keycloak = getKeycloakInstance();
  
  // If already initialized, return the authenticated status
  if (keycloakInitialized) {
    return keycloak.authenticated || false;
  }

  // If initialization is in progress, wait for it
  if (initPromise) {
    return initPromise;
  }
  
  const defaultOptions = {
    onLoad: 'check-sso',
    checkLoginIframe: false,
    pkceMethod: 'S256',
    ...options,
  };

  try {
    initPromise = keycloak.init(defaultOptions);
    const authenticated = await initPromise;
    keycloakInitialized = true;
    return authenticated;
  } catch (error) {
    console.error('Keycloak initialization error:', error);
    initPromise = null;
    throw error;
  }
}

/**
 * Login with Keycloak
 * @param {Object} options - Login options
 * @returns {Promise<void>}
 */
export async function login(options = {}) {
  try {
    // Initialize Keycloak first if not already initialized
    await initKeycloak({ onLoad: 'check-sso' });
  } catch (error) {
    console.warn('Keycloak init during login:', error);
    // Continue anyway to attempt login
  }
  
  const keycloak = getKeycloakInstance();
  
  if (!keycloak) {
    throw new Error('Keycloak instance not available');
  }
  
  // Get redirect URL and app parameter from sessionStorage if exists
  const redirectUrl = sessionStorage.getItem('redirect_after_login');
  const appParam = sessionStorage.getItem('app_after_login');
  
  // Also store in localStorage as backup (sessionStorage can be lost on external redirects)
  if (redirectUrl) {
    localStorage.setItem('redirect_after_login', redirectUrl);
  }
  if (appParam) {
    localStorage.setItem('app_after_login', appParam);
  }
  
  // Create state parameter to pass redirect URL and app through OAuth flow
  const stateData = {};
  if (redirectUrl) stateData.redirect = redirectUrl;
  if (appParam) stateData.app = appParam;
  const state = Object.keys(stateData).length > 0 ? JSON.stringify(stateData) : undefined;
  
  const defaultOptions = {
    redirectUri: window.location.origin + '/auth/callback',
    ...(state && { state }), // Add state if redirect URL or app exists
    ...options,
  };

  await keycloak.login(defaultOptions);
}

/**
 * Logout from Keycloak
 * @param {Object} options - Logout options
 * @returns {Promise<void>}
 */
export async function logout(options = {}) {
  const keycloak = getKeycloakInstance();
  
  const defaultOptions = {
    redirectUri: window.location.origin,
    ...options,
  };

  await keycloak.logout(defaultOptions);
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  const keycloak = getKeycloakInstance();
  return keycloak.authenticated || false;
}

/**
 * Get access token
 * @returns {string|null}
 */
export function getToken() {
  const keycloak = getKeycloakInstance();
  return keycloak.token || null;
}

/**
 * Get ID token
 * @returns {string|null}
 */
export function getIdToken() {
  const keycloak = getKeycloakInstance();
  return keycloak.idToken || null;
}

/**
 * Get refresh token
 * @returns {string|null}
 */
export function getRefreshToken() {
  const keycloak = getKeycloakInstance();
  return keycloak.refreshToken || null;
}

/**
 * Update token if it's about to expire
 * @param {number} minValidity - Minimum validity in seconds
 * @returns {Promise<boolean>} True if token was refreshed
 */
export async function updateToken(minValidity = 30) {
  const keycloak = getKeycloakInstance();
  try {
    const refreshed = await keycloak.updateToken(minValidity);
    return refreshed;
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
}

/**
 * Get user profile from Keycloak
 * @returns {Promise<Object>} User profile
 */
export async function loadUserProfile() {
  const keycloak = getKeycloakInstance();
  try {
    const profile = await keycloak.loadUserProfile();
    return profile;
  } catch (error) {
    console.error('Load user profile error:', error);
    throw error;
  }
}

/**
 * Extract NIP or email from Keycloak token
 * @returns {string} NIP or email identifier
 */
export function extractIdentifier() {
  const keycloak = getKeycloakInstance();
  
  if (!keycloak.tokenParsed) {
    return '';
  }

  const tokenParsed = keycloak.tokenParsed;
  
  // Try to get NIP first (might be in preferred_username or custom attribute)
  const nip = tokenParsed.nip || tokenParsed.preferred_username;
  
  // If NIP looks valid (18 digits), use it
  if (nip && /^\d{18}$/.test(nip)) {
    return nip;
  }
  
  // Otherwise fall back to email
  return tokenParsed.email || tokenParsed.preferred_username || '';
}

/**
 * Get parsed token
 * @returns {Object|null}
 */
export function getTokenParsed() {
  const keycloak = getKeycloakInstance();
  return keycloak.tokenParsed || null;
}

/**
 * Add callback for token expiration
 * @param {Function} callback - Callback function
 */
export function onTokenExpired(callback) {
  const keycloak = getKeycloakInstance();
  keycloak.onTokenExpired = callback;
}

/**
 * Add callback for authentication success
 * @param {Function} callback - Callback function
 */
export function onAuthSuccess(callback) {
  const keycloak = getKeycloakInstance();
  keycloak.onAuthSuccess = callback;
}

/**
 * Add callback for authentication error
 * @param {Function} callback - Callback function
 */
export function onAuthError(callback) {
  const keycloak = getKeycloakInstance();
  keycloak.onAuthError = callback;
}

/**
 * Add callback for authentication refresh success
 * @param {Function} callback - Callback function
 */
export function onAuthRefreshSuccess(callback) {
  const keycloak = getKeycloakInstance();
  keycloak.onAuthRefreshSuccess = callback;
}

/**
 * Add callback for authentication refresh error
 * @param {Function} callback - Callback function
 */
export function onAuthRefreshError(callback) {
  const keycloak = getKeycloakInstance();
  keycloak.onAuthRefreshError = callback;
}

// Legacy support functions (for backward compatibility)
export function getAuthorizationUrl() {
  console.warn('getAuthorizationUrl() is deprecated. Use login() instead.');
  return null;
}

export default {
  getKeycloakInstance,
  initKeycloak,
  login,
  logout,
  isAuthenticated,
  getToken,
  getIdToken,
  getRefreshToken,
  updateToken,
  loadUserProfile,
  extractIdentifier,
  getTokenParsed,
  onTokenExpired,
  onAuthSuccess,
  onAuthError,
  onAuthRefreshSuccess,
  onAuthRefreshError,
};
