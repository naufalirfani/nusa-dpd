/**
 * API Configuration
 * Centralized API calls
 */

// Base URLs
import encryptTokenForHeader from '@/utils/crypto';

const DEFAULT_SSO_API_TOKEN = import.meta.env.VITE_SSO_GENERATE_TOKEN || import.meta.env.VITE_CMB_API_TOKEN || '';

async function buildHeaders(existing = {}, apiToken = '') {
  const headers = Object.assign({}, existing);
  try {
    let token = apiToken || '';
    if (!token && DEFAULT_SSO_API_TOKEN) {
      token = await encryptTokenForHeader(DEFAULT_SSO_API_TOKEN, { salt: DEFAULT_SSO_API_TOKEN });
    }
    if (token) headers['X-Api-Token'] = token;
  } catch (e) {
    console.error('[API] buildHeaders error', e);
  }
  return headers;
}

export async function getApiHeaders(existing = {}, apiToken = '') {
  return buildHeaders(existing, apiToken);
}

const DPD_PORTAL_BASE = import.meta.env.VITE_DPD_PORTAL_BASE || 'https://okk.dpd.go.id';
const DAYOFF_API_BASE = import.meta.env.VITE_DAYOFF_API_BASE || 'https://dayoffapi.vercel.app/api';
const KEYCLOAK_BASE = import.meta.env.VITE_KEYCLOAK_BASE_URL || 'https://auth.dpd.go.id';
const BE_URL = import.meta.env.VITE_BE_URL || 'http://localhost:8000';

// Simple in-memory request dedupe cache to avoid duplicate identical fetches
const requestCache = new Map();

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

  const url = `${BE_URL}/api/sso/generate/${encodeURIComponent(identifier)}?${params.toString()}`;
  const headersWithToken = await buildHeaders(headers, apiToken);
  const res = await fetch(url, { 
    method: 'GET',
    mode: 'cors',
    credentials: 'include', 
    headers: headersWithToken
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
 * @returns {Promise<{valid: boolean, status?: number, message?: string}>} Token validity with details
 */
export async function verifySsoToken(token, apiToken = '') {
  const url = `${BE_URL}/api/sso/verify/${encodeURIComponent(token)}`;
  
  try {
    const headers = await buildHeaders({}, apiToken);
    const res = await fetch(url, { 
      method: 'GET',
      mode: 'cors',
      credentials: 'include', 
      headers 
    });
    
    const ct = res.headers.get('content-type') || '';
    
    if (ct.includes('application/json')) {
      const j = await res.json().catch(() => ({}));
      
      // Handle 404 User Not Found case
      if (res.status === 404 && j.status === false) {
        return {
          valid: false,
          status: 404,
          message: j.message || 'User not found'
        };
      }
      
      if (!res.ok) {
        return {
          valid: false,
          status: res.status,
          message: j.message || res.statusText
        };
      }
      
      if (j && (j.status === true || j.valid === true)) {
        return { valid: true };
      }
      
      return { valid: false };
    }
    
    if (!res.ok) {
      return { valid: false, status: res.status };
    }
    
    return { valid: true };
  } catch (e) {
    console.error('[API] verifySsoToken error', e);
    return { valid: false, message: e.message };
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
  const headers = await buildHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
  const response = await fetch(tokenUrl, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    headers,
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
  const headers = await buildHeaders({ Authorization: `Bearer ${accessToken}` });
  const response = await fetch(userinfoUrl, {
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Failed to get user info: ${response.status} ${response.statusText} ${errorText}`
    );
  }

  return response.json();
}

/**
 * Admin login with encrypted credentials
 * @param {string} email - Email (will be encrypted)
 * @param {string} password - Password (will be encrypted)
 * @returns {Promise<{success: boolean, token?: string, expires_in?: number, message?: string}>}
 */
export async function adminLogin(email, password) {
  try {
    // Encrypt email and password using the same salt
    const encryptedEmail = await encryptTokenForHeader(email, { salt: email });
    const encryptedPassword = await encryptTokenForHeader(password, { salt: password });

    const url = `${BE_URL}/api/admin/login`;
    const headers = await buildHeaders({
      'Content-Type': 'application/json',
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: encryptedEmail,
        password: encryptedPassword,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Login gagal',
      };
    }

    return {
      success: true,
      token: data.data?.token,
      expires_in: data.data?.expires_in,
    };
  } catch (error) {
    console.error('Admin login error:', error);
    return {
      success: false,
      message: 'Terjadi kesalahan saat login',
    };
  }
}

/**
 * Admin logout
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function adminLogout() {
  try {
    const url = `${BE_URL}/api/admin/logout`;
    const token = sessionStorage.getItem('admin_token');
    
    const headers = await buildHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Logout gagal',
      };
    }

    return {
      success: true,
      message: data.message,
    };
  } catch (error) {
    console.error('Admin logout error:', error);
    return {
      success: false,
      message: 'Terjadi kesalahan saat logout',
    };
  }
}

/**
 * Verify admin JWT token
 * @param {string} token - JWT token to verify
 * @returns {Promise<{success: boolean, valid: boolean, payload?: object, expires_at?: string, message?: string}>}
 */
export async function adminVerifyToken(token) {
  try {
    const url = `${BE_URL}/api/admin/verify`;
    
    const headers = await buildHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        valid: false,
        message: data.message || 'Token verification failed',
        expired: data.expired,
      };
    }

    return {
      success: true,
      valid: true,
      payload: data.data?.payload,
      expires_at: data.data?.expires_at,
      message: data.message,
    };
  } catch (error) {
    console.error('Admin verify token error:', error);
    return {
      success: false,
      valid: false,
      message: 'Terjadi kesalahan saat verifikasi token',
    };
  }
}

/**
 * Get all pegawai (employees) for dropdown
 * @returns {Promise<Array>} List of employees
 */
export async function getPegawai() {
  const url = `${BE_URL}/api/pegawai?include_json=false&with_pagination=false`;
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch pegawai: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get all kegiatan
 * @returns {Promise<Array>} List of kegiatan
 */
export async function getKegiatan(params = {}) {
  const queryParams = new URLSearchParams();
  
  // Add all provided parameters to query string
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      queryParams.append(key, params[key]);
    }
  });
  
  const queryString = queryParams.toString();
  const url = `${BE_URL}/api/kegiatan${queryString ? `?${queryString}` : ''}`;
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch kegiatan: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get single kegiatan by ID
 * @param {string|number} id - Kegiatan ID
 * @returns {Promise<object>} Kegiatan data
 */
export async function getKegiatanById(id) {
  const key = `getKegiatanById:${id}`;
  if (requestCache.has(key)) return requestCache.get(key);

  const promise = (async () => {
    const url = `${BE_URL}/api/kegiatan/${id}`;
    const headers = await buildHeaders();
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch kegiatan: ${response.status} ${response.statusText}`);
    }

    return response.json();
  })();

  // store promise so concurrent callers reuse it
  requestCache.set(key, promise);
  // cleanup shortly after resolution to avoid unbounded growth
  promise
    .catch(() => {})
    .finally(() => setTimeout(() => requestCache.delete(key), 1000));

  return promise;
}

/**
 * Create new kegiatan
 * @param {FormData} formData - Kegiatan data (including file upload)
 * @returns {Promise<object>} Created kegiatan
 */
export async function createKegiatan(formData) {
  const url = `${BE_URL}/api/kegiatan`;
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to create kegiatan: ${response.status} ${response.statusText} ${errorText}`);
  }

  return response.json();
}

/**
 * Update kegiatan
 * @param {string|number} id - Kegiatan ID
 * @param {FormData} formData - Updated kegiatan data
 * @returns {Promise<object>} Updated kegiatan
 */
export async function updateKegiatan(id, formData) {
  const url = `${BE_URL}/api/kegiatan/${id}`;
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to update kegiatan: ${response.status} ${response.statusText} ${errorText}`);
  }

  return response.json();
}

/**
 * Test generate sertifikat for kegiatan
 * @param {string|number} id - Kegiatan ID
 * @returns {Promise<Blob>} PDF blob
 */
export async function testCertificate(id) {
  const url = `${BE_URL}/api/kegiatan/${id}/test-certificate`;
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gagal generate sertifikat: ${response.status} ${response.statusText} ${errorText}`);
  }

  return response.blob();
}

/**
 * Delete kegiatan
 * @param {string|number} id - Kegiatan ID
 * @returns {Promise<object>} Delete response
 */
export async function deleteKegiatan(id) {
  const url = `${BE_URL}/api/kegiatan/${id}`;
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: 'DELETE',
    mode: 'cors',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to delete kegiatan: ${response.status} ${response.statusText} ${errorText}`);
  }

  return response.json();
}

/**
 * Delete media file
 * @param {string} filePath - Relative path of the file to delete (e.g., "certificates/filename.png")
 * @returns {Promise<object>} Delete response
 */
export async function deleteMediaFile(filePath) {
  const url = `${BE_URL}/api/media?path=${encodeURIComponent(filePath)}`;
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: 'DELETE',
    mode: 'cors',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to delete file: ${response.status} ${response.statusText} ${errorText}`);
  }

  return response.json();
}

/**
 * Upload media file (FormData)
 * @param {FormData} formData - FormData with `file` and optional `directory`
 * @returns {Promise<object>} Upload response
 */
export async function uploadMedia(formData) {
  const url = `${BE_URL}/api/media`;
  // Do not set Content-Type; browser will set multipart boundary
  const headers = await buildHeaders({ Accept: 'application/json' });
  const response = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to upload media: ${response.status} ${response.statusText} ${errorText}`);
  }

  return response.json();
}

/**
 * Get list of uploaded media files
 * @param {string} directory - Optional directory filter (e.g., "certificates")
 * @returns {Promise<Array>} List of uploaded files
 */
export async function getMediaFiles(directory = null) {
  let url = `${BE_URL}/api/media`;
  if (directory) {
    url += `?directory=${encodeURIComponent(directory)}`;
  }
  
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to fetch media files: ${response.status} ${response.statusText} ${errorText}`);
  }

  return response.json();
}

/**
 * Get kegiatan-pegawai (employee activities)
 * @param {object} params - Query parameters (e.g., {nip: '123456'})
 * @returns {Promise<object>} List of kegiatan-pegawai
 */
export async function getKegiatanPegawai(params = {}) {
  const queryParams = new URLSearchParams();
  
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      queryParams.append(key, params[key]);
    }
  });
  
  const queryString = queryParams.toString();
  const url = `${BE_URL}/api/kegiatan-pegawai${queryString ? `?${queryString}` : ''}`;
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to fetch kegiatan-pegawai: ${response.status} ${response.statusText} ${errorText}`);
  }

  return response.json();
}

/**
 * Get single kegiatan-pegawai by ID
 * @param {string|number} id - Kegiatan-pegawai ID
 * @returns {Promise<object>} Kegiatan-pegawai data
 */
export async function getKegiatanPegawaiById(id) {
  const url = `${BE_URL}/api/kegiatan-pegawai/${id}`;
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to fetch kegiatan-pegawai: ${response.status} ${response.statusText} ${errorText}`);
  }

  return response.json();
}

/**
 * Create kegiatan-pegawai (submit attendance/evaluation)
 * @param {object} data - {kegiatan_id, nip, isi_form: {nama_lengkap, ...}}
 * @returns {Promise<object>} Created kegiatan-pegawai
 */
export async function createKegiatanPegawai(data) {
  const url = `${BE_URL}/api/kegiatan-pegawai`;
  const headers = await buildHeaders({ 'Content-Type': 'application/json' });
  const response = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to create kegiatan-pegawai: ${response.status} ${response.statusText} ${errorText}`);
  }

  return response.json();
}

/**
 * Update kegiatan-pegawai
 * @param {string|number} id - Kegiatan-pegawai ID
 * @param {object} data - Updated data
 * @returns {Promise<object>} Updated kegiatan-pegawai
 */
export async function updateKegiatanPegawai(id, data) {
  const url = `${BE_URL}/api/kegiatan-pegawai/${id}`;
  const headers = await buildHeaders({ 'Content-Type': 'application/json' });
  const response = await fetch(url, {
    method: 'PUT',
    mode: 'cors',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to update kegiatan-pegawai: ${response.status} ${response.statusText} ${errorText}`);
  }

  return response.json();
}

/**
 * Delete kegiatan-pegawai
 * @param {string|number} id - Kegiatan-pegawai ID
 * @returns {Promise<object>} Delete response
 */
export async function deleteKegiatanPegawai(id) {
  const url = `${BE_URL}/api/kegiatan-pegawai/${id}`;
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: 'DELETE',
    mode: 'cors',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to delete kegiatan-pegawai: ${response.status} ${response.statusText} ${errorText}`);
  }

  return response.json();
}

/**
 * Regenerate certificate for kegiatan-pegawai
 * @param {string|number} id - Kegiatan-pegawai ID
 * @returns {Promise<object>} Certificate regeneration response
 */
export async function regenerateCertificate(id) {
  const url = `${BE_URL}/api/kegiatan-pegawai/${id}/regenerate-certificate`;
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to regenerate certificate: ${response.status} ${response.statusText} ${errorText}`);
  }

  return response.json();
}

/**
 * Get kegiatan by linktree slug
 * @param {string} slug - Linktree slug
 * @returns {Promise<object>} Kegiatan data
 */
export async function getLinktree(slug) {
  const url = `${BE_URL}/api/kegiatan/linktree/${encodeURIComponent(slug)}`;
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch linktree: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Verify certificate by token
 * @param {string} token - Verification token
 * @returns {Promise<object>} Verification result with certificate data
 */
export async function verifyCertificate(token) {
  const key = `verifyCertificate:${token}`;
  if (requestCache.has(key)) return requestCache.get(key);

  const promise = (async () => {
    const url = `${BE_URL}/api/sertifikat/verify/${encodeURIComponent(token)}`;
    const headers = await buildHeaders();
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        valid: false,
        message: `HTTP ${response.status}`,
      }));
      return errorData;
    }

    return response.json();
  })();

  requestCache.set(key, promise);
  promise.catch(() => {}).finally(() => setTimeout(() => requestCache.delete(key), 1000));
  return promise;
}

export default {
  getDpdPortalApiUrl,
  getDayOffApiUrl,
  generateSsoToken,
  verifySsoToken,
  exchangeKeycloakCode,
  getKeycloakUserInfo,
  adminLogin,
  getPegawai,
  getKegiatan,
  getKegiatanById,
  createKegiatan,
  updateKegiatan,
  testCertificate,
  deleteKegiatan,
  deleteMediaFile,
  uploadMedia,
  getMediaFiles,
  getKegiatanPegawai,
  getKegiatanPegawaiById,
  createKegiatanPegawai,
  updateKegiatanPegawai,
  deleteKegiatanPegawai,
  regenerateCertificate,
  getLinktree,
  verifyCertificate,
};
