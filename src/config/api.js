/**
 * API Configuration
 * Centralized API calls
 */

// Base URLs
import encryptTokenForHeader from "@/utils/crypto";

const DEFAULT_SSO_API_TOKEN =
  import.meta.env.VITE_SSO_GENERATE_TOKEN ||
  import.meta.env.VITE_CMB_API_TOKEN ||
  "";

async function buildHeaders(existing = {}, apiToken = "") {
  const headers = Object.assign({}, existing);
  try {
    let token = apiToken || "";
    if (!token && DEFAULT_SSO_API_TOKEN) {
      token = await encryptTokenForHeader(DEFAULT_SSO_API_TOKEN, {
        salt: DEFAULT_SSO_API_TOKEN,
      });
    }
    if (token) headers["X-Api-Token"] = token;
  } catch (e) {
    console.error("[API] buildHeaders error", e);
  }
  return headers;
}

export async function getApiHeaders(existing = {}, apiToken = "") {
  return buildHeaders(existing, apiToken);
}

const DPD_PORTAL_BASE =
  import.meta.env.VITE_DPD_PORTAL_BASE || "https://okk.dpd.go.id";
const DAYOFF_API_BASE =
  import.meta.env.VITE_DAYOFF_API_BASE || "https://dayoffapi.vercel.app/api";
const KEYCLOAK_BASE =
  import.meta.env.VITE_KEYCLOAK_BASE_URL || "https://auth.dpd.go.id";
const BE_URL = import.meta.env.VITE_BE_URL || "http://localhost:8000";

// Simple in-memory request dedupe cache to avoid duplicate identical fetches
const requestCache = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes cache TTL

/**
 * Get cached promise for a key if it is not expired.
 * @param {string} key - Cache key
 * @returns {Promise<any>|null} The cached promise or null if expired/not found
 */
export function getCachedPromise(key) {
  const entry = requestCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    requestCache.delete(key);
    return null;
  }
  return entry.promise;
}

/**
 * Store a promise in cache with timestamp and TTL.
 * @param {string} key - Cache key
 * @param {Promise<any>} promise - Promise to cache
 * @param {number} ttl - TTL in milliseconds
 */
export function setCachedPromise(key, promise, ttl = CACHE_TTL) {
  const timestamp = Date.now();
  requestCache.set(key, {
    promise,
    timestamp,
    ttl,
  });

  // Remove from cache immediately if the request fails
  promise.catch(() => {
    const current = requestCache.get(key);
    if (current && current.timestamp === timestamp) {
      requestCache.delete(key);
    }
  });

  // Schedule cleanup to avoid memory leak
  setTimeout(() => {
    const current = requestCache.get(key);
    if (current && current.timestamp === timestamp) {
      requestCache.delete(key);
    }
  }, ttl);
}

/**
 * Clear cached items whose keys start with a specific prefix.
 * @param {string} prefix - Key prefix
 */
export function clearCacheByPrefix(prefix) {
  for (const key of requestCache.keys()) {
    if (key.startsWith(prefix)) {
      requestCache.delete(key);
    }
  }
}

/**
 * Clear the entire API request cache.
 */
export function clearApiCache() {
  requestCache.clear();
}

/**
 * Get the full URL for DPD Portal API endpoints
 * @param {string} path - API path (e.g., '/dpd-portal/openapi/...')
 * @returns {string} Full URL
 */
export function getDpdPortalApiUrl(path) {
  return `${DPD_PORTAL_BASE}${path}`;
}

function normalizeUserProfilePayload(raw) {
  if (!raw) return null;

  if (raw.data && raw.data.data) return raw.data.data;

  if (raw.data && typeof raw.data === "object") {
    const data = raw.data;
    if (data.nama || data.nip || data.name || data.email) return data;
  }

  if (typeof raw === "object") {
    if (
      raw.nama ||
      raw.name ||
      raw.email ||
      Object.prototype.hasOwnProperty.call(raw, "nip") ||
      Object.prototype.hasOwnProperty.call(raw, "id")
    ) {
      return raw;
    }
  }

  return null;
}

/**
 * Fetch user profile directly from the API.
 * @param {string} identifier - NIP or email identifier
 * @returns {Promise<Object|null>} Normalized user profile
 */
export async function fetchUserProfileByIdentifier(identifier, params = {}) {
  if (!identifier) return null;

  const queryParams = new URLSearchParams(params);
  const cacheKey = `fetchUserProfileByIdentifier:${identifier}:${queryParams.toString()}`;
  const cached = getCachedPromise(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const beUrl = import.meta.env.VITE_BE_URL || "";
      let url = getDpdPortalApiUrl(
        `/dpd-portal/openapi/profil/${encodeURIComponent(identifier)}`,
      );
      const headers = {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
      };

      if (beUrl) {
        const base = beUrl.replace(/\/$/, "");
        url = `${base}/api/pegawai/${encodeURIComponent(identifier)}`;
        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`;
        }

        if (DEFAULT_SSO_API_TOKEN) {
          try {
            const apiToken = await encryptTokenForHeader(DEFAULT_SSO_API_TOKEN, {
              salt: DEFAULT_SSO_API_TOKEN,
            });
            headers["X-Api-Token"] = apiToken;
          } catch (e) {
            console.error("[API] encrypt profile token error", e);
          }
        }
        headers["Content-Type"] = "application/json";
      } else {
        headers["app-token"] = "ac54ff35-06cc-4702-8d95-f47c735cfaf7";
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "include",
        headers,
      });

      if (!response.ok) return null;

      const payload = await response.json().catch(() => null);
      let profile = normalizeUserProfilePayload(payload);

      if (profile && profile.json && typeof profile.json === "object") {
        profile = { ...profile, ...profile.json };
      }

      return profile;
    } catch (error) {
      console.error("[API] fetchUserProfileByIdentifier error", error);
      return null;
    }
  })();

  setCachedPromise(cacheKey, promise);
  return promise;
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
export async function generateSsoToken(
  identifier,
  apiToken = "",
  expMinutes = 60,
) {
  const params = new URLSearchParams();
  params.set("exp_minutes", String(expMinutes));

  const headers = {};
  if (apiToken) {
    headers["X-Api-Token"] = apiToken;
  }

  const url = `${BE_URL}/api/sso/generate/${encodeURIComponent(identifier)}?${params.toString()}`;
  const headersWithToken = await buildHeaders(headers, apiToken);
  const res = await fetch(url, {
    method: "GET",
    mode: "cors",
    credentials: "include",
    headers: headersWithToken,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to generate token: ${res.status} ${res.statusText} ${text}`,
    );
  }

  const ct = res.headers.get("content-type") || "";
  let token;

  if (ct.includes("application/json")) {
    const j = await res.json().catch(() => ({}));
    token = j && (j.token || j.access_token || j.data || j);
    if (typeof token === "object" && token !== null) {
      token = token.token || token.access_token || "";
    }
  } else {
    token = await res.text().catch(() => "");
  }

  if (!token) throw new Error("SSO did not return a token");
  return token.toString();
}

/**
 * Verify SSO token
 * @param {string} token - JWT token to verify
 * @param {string} apiToken - Optional API token
 * @returns {Promise<{valid: boolean, status?: number, message?: string}>} Token validity with details
 */
export async function verifySsoToken(token, apiToken = "") {
  const url = `${BE_URL}/api/sso/verify/${encodeURIComponent(token)}`;

  try {
    const headers = await buildHeaders({}, apiToken);
    const res = await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "include",
      headers,
    });

    const ct = res.headers.get("content-type") || "";

    if (ct.includes("application/json")) {
      const j = await res.json().catch(() => ({}));

      // Handle 404 User Not Found case
      if (res.status === 404 && j.status === false) {
        return {
          valid: false,
          status: 404,
          message: j.message || "User not found",
        };
      }

      if (!res.ok) {
        return {
          valid: false,
          status: res.status,
          message: j.message || res.statusText,
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
    console.error("[API] verifySsoToken error", e);
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
export async function exchangeKeycloakCode(
  code,
  clientId,
  clientSecret,
  redirectUri,
) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenUrl = `${KEYCLOAK_BASE}/realms/dpd-sso/protocol/openid-connect/token`;
  const headers = await buildHeaders({
    "Content-Type": "application/x-www-form-urlencoded",
  });
  const response = await fetch(tokenUrl, {
    method: "POST",
    mode: "cors",
    credentials: "include",
    headers,
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to exchange code for token: ${response.status} ${response.statusText} ${errorText}`,
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
  const headers = await buildHeaders({
    Authorization: `Bearer ${accessToken}`,
  });
  const response = await fetch(userinfoUrl, {
    method: "GET",
    mode: "cors",
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to get user info: ${response.status} ${response.statusText} ${errorText}`,
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
    const encryptedPassword = await encryptTokenForHeader(password, {
      salt: password,
    });

    const url = `${BE_URL}/api/admin/login`;
    const headers = await buildHeaders({
      "Content-Type": "application/json",
    });

    const response = await fetch(url, {
      method: "POST",
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
        message: data.message || "Login gagal",
      };
    }

    return {
      success: true,
      token: data.data?.token,
      expires_in: data.data?.expires_in,
    };
  } catch (error) {
    console.error("Admin login error:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat login",
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
    const token = sessionStorage.getItem("admin_token");

    const headers = await buildHeaders({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(url, {
      method: "POST",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "Logout gagal",
      };
    }

    return {
      success: true,
      message: data.message,
    };
  } catch (error) {
    console.error("Admin logout error:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat logout",
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
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(url, {
      method: "POST",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        valid: false,
        message: data.message || "Token verification failed",
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
    console.error("Admin verify token error:", error);
    return {
      success: false,
      valid: false,
      message: "Terjadi kesalahan saat verifikasi token",
    };
  }
}

/**
 * Get all pegawai (employees) for dropdown and list views.
 * @param {object} params - Optional query params such as { q, jabatan, unit_kerja }
 * @returns {Promise<Array>} List of employees
 */
export async function getPegawai(params = {}) {
  const queryParams = new URLSearchParams();
  queryParams.set("include_json", "false");
  if (!params.with_pagination) queryParams.set("with_pagination", "false");

  Object.keys(params).forEach((key) => {
    if (
      params[key] !== null &&
      params[key] !== undefined &&
      params[key] !== ""
    ) {
      queryParams.append(key, params[key]);
    }
  });

  const queryString = queryParams.toString();
  const key = `getPegawai:${queryString}`;
  const cached = getCachedPromise(key);
  if (cached) return cached;

  const promise = (async () => {
    const url = `${BE_URL}/api/pegawai?${queryString}`;
    const headers = await buildHeaders();
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch pegawai: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const payload = data?.data;

    if (params.with_pagination) {
      return data; // Return full response with pagination info
    }

    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(data)) return data;

    return [];
  })();

  setCachedPromise(key, promise);
  return promise;
}

export async function getUnitKerja() {
  const url = `${BE_URL}/api/unit-organisasi`;
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    headers,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch unit kerja: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data?.data || [];
}

/**
 * Get penilaian pegawai records.
 * @param {object} params - Optional query params such as { only_latest_periode: 1 }
 * @returns {Promise<Array>} List of penilaian pegawai records
 */
export async function getPenilaianPegawai(params = {}) {
  const queryParams = new URLSearchParams();

  Object.keys(params).forEach((key) => {
    if (
      params[key] !== null &&
      params[key] !== undefined &&
      params[key] !== ""
    ) {
      queryParams.append(key, params[key]);
    }
  });

  const queryString = queryParams.toString();
  const key = `getPenilaianPegawai:${queryString}`;
  const cached = getCachedPromise(key);
  if (cached) return cached;

  const promise = (async () => {
    const url = `${BE_URL}/api/penilaian-pegawai${queryString ? `?${queryString}` : ""}`;
    const headers = await buildHeaders();
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch penilaian pegawai: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const payload = data?.data;

    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(data)) return data;

    return [];
  })();

  setCachedPromise(key, promise);
  return promise;
}

/**
 * Get penilaian pegawai records with pagination and full response details.
 * @param {object} params - Query params
 * @returns {Promise<object>} Full API response including pagination metadata and data
 */
export async function getPenilaianPegawaiPaginated(params = {}) {
  const queryParams = new URLSearchParams();

  Object.keys(params).forEach((key) => {
    if (
      params[key] !== null &&
      params[key] !== undefined &&
      params[key] !== ""
    ) {
      queryParams.append(key, params[key]);
    }
  });

  const queryString = queryParams.toString();
  const url = `${BE_URL}/api/penilaian-pegawai${queryString ? `?${queryString}` : ""}`;
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    headers,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch penilaian pegawai: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

/**
 * Delete penilaian pegawai by ID
 * @param {string|number} id - Penilaian pegawai ID
 * @returns {Promise<object>} Delete response
 */
export async function deletePenilaianPegawai(id) {
  const url = `${BE_URL}/api/penilaian-pegawai/${id}`;
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: "DELETE",
    mode: "cors",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to delete penilaian pegawai: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  clearCacheByPrefix("getPenilaianPegawai");
  return response.json();
}

/**
 * Simpan penilaian pegawai.
 * @param {object} payload - { periode, nip_pegawai, penilai }
 * @returns {Promise<object>} API response
 */
export async function createPenilaianPegawai(payload) {
  const url = `${BE_URL}/api/penilaian-pegawai`;
  const headers = await buildHeaders({
    "Content-Type": "application/json",
    Accept: "application/json",
  });

  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to save penilaian pegawai: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  clearCacheByPrefix("getPenilaianPegawai");
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

/**
 * Reset / Hard delete penilaian pegawai.
 * @param {object} payload - { periode, nip_pegawai, nip_pegawai_list, q, unit_organisasi_id, jabatan }
 * @returns {Promise<object>} API response
 */
export async function resetPenilaianPegawai(payload = {}) {
  const url = `${BE_URL}/api/penilaian-pegawai/reset`;
  const headers = await buildHeaders({
    "Content-Type": "application/json",
    Accept: "application/json",
  });

  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to reset penilaian pegawai: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  clearCacheByPrefix("getPenilaianPegawai");
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

/**
 * Simpan jawaban penilaian untuk satu penugasan penilai.
 * @param {string|number} id - ID record penilaian pegawai (penilai)
 * @param {object} payload - { penilaian: {...jawaban} }
 * @returns {Promise<object>} API response
 */
export async function inputPenilaian(id, payload) {
  const url = `${BE_URL}/api/penilaian-pegawai/${id}/input-penilaian`;
  const headers = await buildHeaders({
    "Content-Type": "application/json",
    Accept: "application/json",
  });

  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to input penilaian: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  clearCacheByPrefix("getPenilaianPegawai");
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export async function getFeedbackTemplates() {
  const key = "getFeedbackTemplates:";
  const cached = getCachedPromise(key);
  if (cached) return cached;

  const promise = (async () => {
    const url = `${BE_URL}/api/feedback-template`;
    const headers = await buildHeaders();
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch feedback templates: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  })();

  setCachedPromise(key, promise);
  return promise;
}

export async function saveFeedbackTemplate(template) {
  const url = `${BE_URL}/api/feedback-template`;
  const headers = await buildHeaders({ "Content-Type": "application/json" });
  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers,
    body: JSON.stringify(template),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to save feedback template: ${response.status} ${response.statusText}`,
    );
  }

  clearCacheByPrefix("getFeedbackTemplates");
  return response;
}

/**
 * Get all kegiatan
 * @returns {Promise<Array>} List of kegiatan
 */
export async function getKegiatan(params = {}) {
  const queryParams = new URLSearchParams();

  // Add all provided parameters to query string
  Object.keys(params).forEach((key) => {
    if (
      params[key] !== null &&
      params[key] !== undefined &&
      params[key] !== ""
    ) {
      queryParams.append(key, params[key]);
    }
  });

  const queryString = queryParams.toString();
  const key = `getKegiatan:${queryString}`;
  const cached = getCachedPromise(key);
  if (cached) return cached;

  const promise = (async () => {
    const url = `${BE_URL}/api/kegiatan${queryString ? `?${queryString}` : ""}`;
    const headers = await buildHeaders();
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch kegiatan: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  })();

  setCachedPromise(key, promise);
  return promise;
}

/**
 * Get single kegiatan by ID
 * @param {string|number} id - Kegiatan ID
 * @returns {Promise<object>} Kegiatan data
 */
export async function getKegiatanById(id) {
  const key = `getKegiatanById:${id}`;
  const cached = getCachedPromise(key);
  if (cached) return cached;

  const promise = (async () => {
    const url = `${BE_URL}/api/kegiatan/${id}`;
    const headers = await buildHeaders();
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch kegiatan: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  })();

  setCachedPromise(key, promise);
  return promise;
}

/**
 * Helper to perform POST/PUT request with optional upload progress tracking using XMLHttpRequest
 */
async function postWithProgress(url, formData, customHeaders = {}, onUploadProgress = null) {
  const headers = await buildHeaders(customHeaders);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;

    Object.keys(headers).forEach((key) => {
      if (key.toLowerCase() !== "content-type") {
        xhr.setRequestHeader(key, headers[key]);
      }
    });

    if (xhr.upload && typeof onUploadProgress === "function") {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onUploadProgress(percent, event.loaded, event.total);
        }
      };
    }

    xhr.onload = () => {
      let resData;
      try {
        resData = JSON.parse(xhr.responseText);
      } catch (e) {
        resData = xhr.responseText;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(resData);
      } else {
        const err = new Error(
          (typeof resData === "object" && resData?.message)
            ? resData.message
            : `Request failed with status ${xhr.status}: ${xhr.statusText}`
        );
        err.status = xhr.status;
        err.errors = (typeof resData === "object" && resData?.errors) ? resData.errors : null;
        err.response = { data: resData, errors: err.errors };
        reject(err);
      }
    };

    xhr.onerror = () => {
      reject(new Error("Terjadi kesalahan jaringan saat mengunggah file."));
    };

    xhr.ontimeout = () => {
      reject(new Error("Waktu permintaan mengunggah file telah habis (timeout)."));
    };

    xhr.send(formData);
  });
}

/**
 * Create new kegiatan
 * @param {FormData} formData - Kegiatan data (including file upload)
 * @param {Function} [onUploadProgress] - Callback for upload progress (percent, loaded, total)
 * @returns {Promise<object>} Created kegiatan
 */
export async function createKegiatan(formData, onUploadProgress = null) {
  const url = `${BE_URL}/api/kegiatan`;
  const result = await postWithProgress(url, formData, {}, onUploadProgress);
  clearCacheByPrefix("getKegiatan");
  return result;
}

/**
 * Update kegiatan
 * @param {string|number} id - Kegiatan ID
 * @param {FormData} formData - Updated kegiatan data
 * @param {Function} [onUploadProgress] - Callback for upload progress (percent, loaded, total)
 * @returns {Promise<object>} Updated kegiatan
 */
export async function updateKegiatan(id, formData, onUploadProgress = null) {
  const url = `${BE_URL}/api/kegiatan/${id}`;
  const result = await postWithProgress(url, formData, {}, onUploadProgress);
  clearCacheByPrefix("getKegiatan");
  return result;
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
    method: "GET",
    mode: "cors",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Gagal generate sertifikat: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  return response.blob();
}

/**
 * Fetch QR Code presensi blob for a Kegiatan.
 * @param {string} id - Kegiatan ID
 * @returns {Promise<Blob>} Image PNG blob
 */
export async function getQrCodePresensi(id) {
  const url = `${BE_URL}/api/kegiatan/${id}/qrcode-presensi`;
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Gagal mengambil QR Code: ${response.status} ${response.statusText} ${errorText}`,
    );
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
    method: "DELETE",
    mode: "cors",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to delete kegiatan: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  clearCacheByPrefix("getKegiatan");
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
    method: "DELETE",
    mode: "cors",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to delete file: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  return response.json();
}

/**
 * Upload media file (FormData)
 * @param {FormData} formData - FormData with `file` and optional `directory`
 * @param {Function} [onUploadProgress] - Callback for upload progress (percent, loaded, total)
 * @returns {Promise<object>} Upload response
 */
export async function uploadMedia(formData, onUploadProgress = null) {
  const url = `${BE_URL}/api/media`;
  return postWithProgress(url, formData, { Accept: "application/json" }, onUploadProgress);
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
    method: "GET",
    mode: "cors",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to fetch media files: ${response.status} ${response.statusText} ${errorText}`,
    );
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

  Object.keys(params).forEach((key) => {
    if (
      params[key] !== null &&
      params[key] !== undefined &&
      params[key] !== ""
    ) {
      queryParams.append(key, params[key]);
    }
  });

  const queryString = queryParams.toString();
  const key = `getKegiatanPegawai:${queryString}`;
  const cached = getCachedPromise(key);
  if (cached) return cached;

  const promise = (async () => {
    const url = `${BE_URL}/api/kegiatan-pegawai${queryString ? `?${queryString}` : ""}`;
    const headers = await buildHeaders();
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Failed to fetch kegiatan-pegawai: ${response.status} ${response.statusText} ${errorText}`,
      );
    }

    return response.json();
  })();

  setCachedPromise(key, promise);
  return promise;
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
    method: "GET",
    mode: "cors",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to fetch kegiatan-pegawai: ${response.status} ${response.statusText} ${errorText}`,
    );
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
  const headers = await buildHeaders({ "Content-Type": "application/json" });
  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to create kegiatan-pegawai: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  clearCacheByPrefix("getKegiatanPegawai");
  return response.json();
}

/**
 * Create kegiatan-evaluasi-narasumber (submit speaker evaluation response)
 * @param {object} data - {kegiatan_id, nip, isi_form}
 * @returns {Promise<object>} Created evaluation record
 */
export async function createKegiatanEvaluasiNarasumber(data) {
  const url = `${BE_URL}/api/kegiatan-evaluasi-narasumber`;
  const headers = await buildHeaders({ "Content-Type": "application/json" });
  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to submit speaker evaluation: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  clearCacheByPrefix("getKegiatanEvaluasiNarasumber");
  return response.json();
}

/**
 * Get kegiatan-evaluasi-narasumber
 * @param {object} params - {kegiatan_id, nip}
 * @returns {Promise<object>} List of evaluation records
 */
export async function getKegiatanEvaluasiNarasumber(params = {}) {
  const queryParams = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
      queryParams.append(key, params[key]);
    }
  });
  const queryString = queryParams.toString();
  const key = `getKegiatanEvaluasiNarasumber:${queryString}`;
  const cached = getCachedPromise(key);
  if (cached) return cached;

  const promise = (async () => {
    const url = `${BE_URL}/api/kegiatan-evaluasi-narasumber${queryString ? `?${queryString}` : ""}`;
    const headers = await buildHeaders();
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Failed to fetch kegiatan-evaluasi-narasumber: ${response.status} ${response.statusText} ${errorText}`,
      );
    }

    return response.json();
  })();

  setCachedPromise(key, promise);
  return promise;
}

/**
 * Update kegiatan-pegawai
 * @param {string|number} id - Kegiatan-pegawai ID
 * @param {object} data - Updated data
 * @returns {Promise<object>} Updated kegiatan-pegawai
 */
export async function updateKegiatanPegawai(id, data) {
  const url = `${BE_URL}/api/kegiatan-pegawai/${id}`;
  const headers = await buildHeaders({ "Content-Type": "application/json" });
  const response = await fetch(url, {
    method: "PUT",
    mode: "cors",
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to update kegiatan-pegawai: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  clearCacheByPrefix("getKegiatanPegawai");
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
    method: "DELETE",
    mode: "cors",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to delete kegiatan-pegawai: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  clearCacheByPrefix("getKegiatanPegawai");
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
    method: "POST",
    mode: "cors",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to regenerate certificate: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  clearCacheByPrefix("getKegiatanPegawai");
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
    method: "GET",
    mode: "cors",
    headers,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch linktree: ${response.status} ${response.statusText}`,
    );
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
  const cached = getCachedPromise(key);
  if (cached) return cached;

  const promise = (async () => {
    const url = `${BE_URL}/api/sertifikat/verify/${encodeURIComponent(token)}`;
    const headers = await buildHeaders();
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
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

  setCachedPromise(key, promise);
  return promise;
}

/**
 * Get all jabatan (jobs/positions) for dropdown.
 * @returns {Promise<Array>} List of jabatan
 */
export async function getJabatan() {
  const url = `${BE_URL}/api/jabatan`;
  const headers = await buildHeaders();
  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    headers,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch jabatan: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data?.data || [];
}

/**
 * Generate Penilaian Pegawai based on filters.
 * @param {object} payload - { periode, q, unit_organisasi_id, jabatan }
 * @returns {Promise<object>} API response
 */
export async function generatePenilaianPegawai(payload) {
  const url = `${BE_URL}/api/penilaian-pegawai/generate`;
  const headers = await buildHeaders({
    "Content-Type": "application/json",
    Accept: "application/json",
  });

  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to generate penilaian pegawai: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  clearCacheByPrefix("getPenilaianPegawai");
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

/**
 * Publish/activate all assessments for the latest period.
 * @returns {Promise<object>} API response
 */
export async function activateLatestPenilaianPegawai() {
  const url = `${BE_URL}/api/penilaian-pegawai/activate-latest`;
  const headers = await buildHeaders({
    "Content-Type": "application/json",
    Accept: "application/json",
  });

  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to activate/publish penilaian pegawai: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  clearCacheByPrefix("getPenilaianPegawai");
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
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
  getQrCodePresensi,
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
  getUnitKerja,
  getPenilaianPegawai,
  getPenilaianPegawaiPaginated,
  deletePenilaianPegawai,
  createPenilaianPegawai,
  inputPenilaian,
  getFeedbackTemplates,
  saveFeedbackTemplate,
  getJabatan,
  generatePenilaianPegawai,
  activateLatestPenilaianPegawai,
  resetPenilaianPegawai,
};
