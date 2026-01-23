/**
 * Keycloak SSO Configuration
 * Handles OAuth 2.0 / OpenID Connect flow with DPD Keycloak server
 */

const KEYCLOAK_CONFIG = {
  baseUrl: import.meta.env.VITE_KEYCLOAK_BASE_URL,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  clientSecret: import.meta.env.VITE_KEYCLOAK_CLIENT_SECRET,
  // Use environment variable if set, otherwise default to production URL
  // For local dev, set VITE_KEYCLOAK_REDIRECT_URI in .env.local
  redirectUri: import.meta.env.VITE_KEYCLOAK_REDIRECT_URI,
};

/**
 * Get the authorization URL to redirect users to Keycloak login
 * @returns {string} Full authorization URL
 */
export function getAuthorizationUrl() {
  const params = new URLSearchParams({
    client_id: KEYCLOAK_CONFIG.clientId,
    redirect_uri: KEYCLOAK_CONFIG.redirectUri,
    response_type: "code",
    scope: "openid profile email",
  });

  return `${KEYCLOAK_CONFIG.baseUrl}/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * @param {string} code - Authorization code from callback
 * @returns {Promise<object>} Token response with access_token, id_token, etc.
 */
export async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: KEYCLOAK_CONFIG.redirectUri,
    client_id: KEYCLOAK_CONFIG.clientId,
    client_secret: KEYCLOAK_CONFIG.clientSecret,
  });

  // Use proxy in dev mode to avoid CORS
  const isDev = import.meta.env.VITE_DEV === 'true';
  const tokenUrl = isDev 
    ? '/keycloak/realms/dpd-sso/protocol/openid-connect/token' 
    : `${KEYCLOAK_CONFIG.baseUrl}/realms/dpd-sso/protocol/openid-connect/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to exchange code for token: ${response.status} ${response.statusText} ${errorText}`
    );
  }

  return response.json();
}

/**
 * Get user information from Keycloak using access token
 * @param {string} accessToken - Access token from token exchange
 * @returns {Promise<object>} User info including sub, email, preferred_username, etc.
 */
export async function getUserInfo(accessToken) {
  // Use proxy in dev mode to avoid CORS
  const isDev = import.meta.env.VITE_DEV === 'true';
  const userinfoUrl = isDev 
    ? '/keycloak/realms/dpd-sso/protocol/openid-connect/userinfo' 
    : `${KEYCLOAK_CONFIG.baseUrl}/realms/dpd-sso/protocol/openid-connect/userinfo`;

  const response = await fetch(userinfoUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to get user info: ${response.status} ${response.statusText} ${errorText}`
    );
  }

  return response.json();
}

/**
 * Extract NIP or email from Keycloak user info
 * @param {object} userInfo - User info object from Keycloak
 * @returns {string} NIP or email identifier
 */
export function extractIdentifier(userInfo) {
  // Try to get NIP first (might be in preferred_username or custom attribute)
  // Adjust these fields based on your Keycloak user attribute mapping
  const nip = userInfo.nip || userInfo.preferred_username;
  
  // If NIP looks valid (18 digits), use it
  if (nip && /^\d{18}$/.test(nip)) {
    return nip;
  }
  
  // Otherwise fall back to email
  return userInfo.email || userInfo.preferred_username || "";
}

/**
 * Logout from Keycloak
 * @param {string} idToken - ID token from login (optional but recommended)
 * @returns {string} Logout URL to redirect to
 */
export function getLogoutUrl(idToken = "") {
  const params = new URLSearchParams({
    client_id: KEYCLOAK_CONFIG.clientId,
    post_logout_redirect_uri: window.location.origin,
  });

  if (idToken) {
    params.set("id_token_hint", idToken);
  }

  return `${KEYCLOAK_CONFIG.baseUrl}/logout?${params.toString()}`;
}

export default KEYCLOAK_CONFIG;
