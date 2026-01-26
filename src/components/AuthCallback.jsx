import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import {
  getKeycloakInstance,
  initKeycloak,
  getToken,
  getIdToken,
  getRefreshToken,
  extractIdentifier,
} from '../config/keycloak';
import { generateSsoToken } from '../config/api';
import { encryptTokenForHeader } from '../utils/crypto';

const JWT_EXPIRES = parseInt(import.meta.env.VITE_JWT_EXPIRES, 10) || 3600;
const SSO_API_TOKEN = import.meta.env.VITE_SSO_GENERATE_TOKEN || '';

function AuthCallback() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  async function createJwt(payload = {}, expiresInSeconds = 3600) {
    const identifierVal =
      payload && (payload.identifier || payload.nip)
        ? payload.identifier || payload.nip
        : '';
    if (!identifierVal)
      throw new Error('Identifier (NIP or email) is required to generate token');

    const expMinutes = Math.ceil(expiresInSeconds / 60);
    let apiToken = SSO_API_TOKEN;
    
    if (apiToken) {
      try {
        apiToken = await encryptTokenForHeader(apiToken, { salt: apiToken });
      } catch (e) {
        // Use raw token if encryption fails
      }
    }

    return await generateSsoToken(identifierVal, apiToken, expMinutes);
  }

  async function handleCallback() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      if (errorParam) {
        throw new Error(
          errorDescription || `Authentication error: ${errorParam}`
        );
      }

      // Initialize Keycloak with login-required to handle the callback
      const authenticated = await initKeycloak({
        onLoad: 'login-required',
      });

      if (!authenticated) {
        throw new Error('Authentication failed');
      }

      // Get token and user info from Keycloak
      const keycloak = getKeycloakInstance();
      const accessToken = getToken();
      const idToken = getIdToken();
      const refreshToken = getRefreshToken();

      // Extract identifier from token
      const identifier = extractIdentifier();

      if (!identifier) {
        throw new Error('Could not extract NIP or email from user info');
      }

      // Generate application JWT
      const appToken = await createJwt({ identifier }, JWT_EXPIRES);

      // Store tokens
      try {
        localStorage.setItem('token', appToken);
        localStorage.setItem('auth', '1');
        localStorage.setItem('keycloak_access_token', accessToken);
        if (idToken) {
          localStorage.setItem('keycloak_id_token', idToken);
        }
        if (refreshToken) {
          localStorage.setItem('keycloak_refresh_token', refreshToken);
        }
      } catch (e) {
        console.error('Failed to store tokens:', e);
      }

      // Get redirect URL and app parameter from sessionStorage and localStorage (fallback)
      const redirectUrl = sessionStorage.getItem('redirect_after_login') || localStorage.getItem('redirect_after_login');
      const appParam = sessionStorage.getItem('app_after_login') || localStorage.getItem('app_after_login');
      
      // Clear from both storages
      sessionStorage.removeItem('redirect_after_login');
      sessionStorage.removeItem('app_after_login');
      localStorage.removeItem('redirect_after_login');
      localStorage.removeItem('app_after_login');

      // Build redirect URL with app parameter if exists
      let finalRedirectUrl = redirectUrl;
      if (appParam && !redirectUrl) {
        // If only app parameter exists, redirect to dashboard with app param
        finalRedirectUrl = `/?app=${encodeURIComponent(appParam)}`;
      } else if (appParam && redirectUrl) {
        // If both exist, ensure app parameter is in the redirect URL
        try {
          const url = new URL(redirectUrl, window.location.origin);
          if (!url.searchParams.has('app')) {
            url.searchParams.set('app', appParam);
            finalRedirectUrl = url.href;
          }
        } catch (e) {
          // If URL parsing fails, append app parameter
          const separator = redirectUrl.includes('?') ? '&' : '?';
          finalRedirectUrl = `${redirectUrl}${separator}app=${encodeURIComponent(appParam)}`;
        }
      }

      // Redirect to the original URL or dashboard
      if (finalRedirectUrl && finalRedirectUrl !== '/') {
        // Validate that URL is properly formatted for external URLs
        if (finalRedirectUrl.startsWith('http://') || finalRedirectUrl.startsWith('https://')) {
          try {
            const url = new URL(finalRedirectUrl);
            // Only allow http and https protocols for security
            if (url.protocol === 'http:' || url.protocol === 'https:') {
              window.location.href = finalRedirectUrl;
              return;
            } else {
              console.warn('Invalid protocol for redirect:', url.protocol);
            }
          } catch (e) {
            console.error('Invalid redirect URL:', e);
          }
        } else {
          // For relative URLs, use navigate
          navigate(finalRedirectUrl, { replace: true });
          return;
        }
      }
      
      // Default redirect to dashboard
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Auth callback error:', err);
      const errorMsg = err.message || 'Authentication failed';
      setError(errorMsg);

      if (typeof window.Swal !== 'undefined') {
        window.Swal.fire({
          icon: 'error',
          title: t('auth_failed') || 'Authentication Failed',
          text: errorMsg,
          confirmButtonText: t('back_to_login') || 'Back to Login',
        }).then(() => {
          redirectToLogin();
        });
      }
    }
  }

  function redirectToLogin() {
    try {
      localStorage.removeItem('auth');
      localStorage.removeItem('token');
      localStorage.removeItem('keycloak_access_token');
      localStorage.removeItem('keycloak_id_token');
      localStorage.removeItem('keycloak_refresh_token');
    } catch (e) {
      /* ignore */
    }

    navigate('/login', { replace: true });
  }

  useEffect(() => {
    handleCallback();
  }, []);

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10 animate-gradient bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-200 via-sky-100 to-white"></div>

      {/* Centered loading state */}
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          {/* Glassmorphism card */}
          <div className="rounded-3xl bg-gradient-to-br from-white/80 to-white/40 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur-xl">
            {/* Loading spinner */}
            <div className="mb-6 flex justify-center">
              <svg
                className="h-16 w-16 animate-spin text-teal-500"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            </div>

            <h2 className="text-2xl font-semibold text-gray-800">
              {t('processing_auth')}
            </h2>
            <p className="mt-2 text-gray-600">{t('please_wait')}</p>

            {/* Error state */}
            {error && (
              <div className="mt-6">
                <div className="rounded-xl bg-rose-50 p-4 ring-1 ring-rose-200">
                  <p className="text-sm font-medium text-rose-800">{error}</p>
                </div>
                <button
                  onClick={redirectToLogin}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 px-6 py-3 font-medium text-white shadow-sm transition hover:from-teal-600 hover:to-sky-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  {t('back_to_login')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gradientMove {
          0% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0); }
        }
        .animate-gradient { animation: gradientMove 12s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export default AuthCallback;
