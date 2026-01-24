/**
 * API Configuration
 * Centralized API calls
 */

// Base URLs
const CMB_BASE = import.meta.env.VITE_CMB_BASE || 'http://localhost:8000';
const DPD_PORTAL_BASE = import.meta.env.VITE_DPD_PORTAL_BASE || 'https://okk.dpd.go.id';
const DAYOFF_API_BASE = import.meta.env.VITE_DAYOFF_API_BASE || 'https://dayoffapi.vercel.app/api';
const KEYCLOAK_BASE = import.meta.env.VITE_KEYCLOAK_BASE_URL || 'https://auth.dpd.go.id';

/**
 * Get the full URL for CMB/SSO API endpoints
 * @param {string} path - API path (e.g., '/sso/generate/123')
 * @returns {string} Full URL
 */
export function getCmbApiUrl(path) {
  return `${CMB_BASE}${path}`;
}

/**
 * Get the full URL for DPD Portal API endpoints
 * @param {string} path - API path (e.g., '/dpd-portal/openapi/...')
 * @returns {string} Full URL
 */
export function getDpdPortalApiUrl(path) {
  return `${DPD_PORTAL_BASE}${path}`;
}

/**
 * Get the full URL for Day Off API endpoints
 * @param {string} path - API path (e.g., '/id/2025')
 * @returns {string} Full URL
 */
export function getDayOffApiUrl(path) {
  return `${DAYOFF_API_BASE}${path}`;
}

/**
 * Generate SSO token
 * @param {string} identifier - NIP or email
 * @param {string} apiToken - Optional API token
 * @param {number} expMinutes - Token expiration in minutes
 * @returns {Promise<string>} JWT token
 */
export async function generateSsoToken(identifier, apiToken = '', expMinutes = 60) {
  const params = new URLSearchParams();
  params.set('exp_minutes', String(expMinutes));

  const headers = {};
  if (apiToken) {
    headers['X-Api-Token'] = apiToken;
  }

  const url = `${CMB_BASE}/sso/generate/${encodeURIComponent(identifier)}?${params.toString()}`;
  const res = await fetch(url, { 
    method: 'GET',
    mode: 'cors',
    credentials: 'include', 
    headers 
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to generate token: ${res.status} ${res.statusText} ${text}`);
  }

  const ct = res.headers.get('content-type') || '';
  let token;

  if (ct.includes('application/json')) {
    const j = await res.json().catch(() => ({}));
    token = j && (j.token || j.access_token || j.data || j);
    if (typeof token === 'object' && token !== null) {
      token = token.token || token.access_token || '';
    }
  } else {
    token = await res.text().catch(() => '');
  }

  if (!token) throw new Error('SSO did not return a token');
  return token.toString();
}

/**
 * Verify SSO token
 * @param {string} token - JWT token to verify
 * @param {string} apiToken - Optional API token
 * @returns {Promise<boolean>} Token validity
 */
export async function verifySsoToken(token, apiToken = '') {
  const headers = {};
  if (apiToken) {
    headers['X-Api-Token'] = apiToken;
  }

  const url = `${CMB_BASE}/sso/verify/${encodeURIComponent(token)}`;
  
  try {
    const res = await fetch(url, { 
      method: 'GET',
      mode: 'cors',
      credentials: 'include', 
      headers 
    });
    
    if (!res.ok) return false;
    
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const j = await res.json().catch(() => ({}));
      if (j && (j.status === true || j.valid === true)) return true;
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('[API] verifySsoToken error', e);
    return false;
  }
}

/**
 * Exchange Keycloak authorization code for tokens
 * @param {string} code - Authorization code
 * @param {string} clientId - Keycloak client ID
 * @param {string} clientSecret - Keycloak client secret
 * @param {string} redirectUri - Redirect URI
 * @returns {Promise<object>} Token response
 */
export async function exchangeKeycloakCode(code, clientId, clientSecret, redirectUri) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenUrl = `${KEYCLOAK_BASE}/realms/dpd-sso/protocol/openid-connect/token`;
  const response = await fetch(tokenUrl, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Failed to exchange code for token: ${response.status} ${response.statusText} ${errorText}`
    );
  }

  return response.json();
}

/**
 * Get Keycloak user info
 * @param {string} accessToken - Access token
 * @returns {Promise<object>} User info
 */
export async function getKeycloakUserInfo(accessToken) {
  const userinfoUrl = `${KEYCLOAK_BASE}/realms/dpd-sso/protocol/openid-connect/userinfo`;
  const response = await fetch(userinfoUrl, {
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Failed to get user info: ${response.status} ${response.statusText} ${errorText}`
    );
  }

  return response.json();
}

export default {
  getCmbApiUrl,
  getDpdPortalApiUrl,
  getDayOffApiUrl,
  generateSsoToken,
  verifySsoToken,
  exchangeKeycloakCode,
  getKeycloakUserInfo,
};
