import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useLoading } from '../stores/loading';
import { encryptTokenForHeader } from '../utils/crypto';
import { verifySsoToken } from '../config/api';
import { initKeycloak, isAuthenticated, login, updateToken } from '../config/keycloak';

const SSO_BASE = import.meta.env.VITE_CMB_BASE || "";
const SSO_API_TOKEN = import.meta.env.VITE_SSO_GENERATE_TOKEN || import.meta.env.VITE_CMB_API_TOKEN || "";

async function verifyTokenWithSso(token) {
  if (!SSO_BASE) {
    return null;
  }

  try {
    let apiToken = SSO_API_TOKEN;
    if (apiToken) {
      try {
        apiToken = await encryptTokenForHeader(apiToken, { salt: apiToken });
      } catch (e) {
        // Use raw token if encryption fails
      }
    }
    
    return await verifySsoToken(token, apiToken);
  } catch (e) {
    console.error("[ProtectedRoute] verifyTokenWithSso error", e);
    return { valid: false };
  }
}

async function isTokenValid() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return { valid: false };

    const serverResponse = await verifyTokenWithSso(token);
    
    // Check for user not found (404) case
    if (serverResponse && serverResponse.status === 404) {
      return { valid: false, userNotFound: true };
    }
    
    if (serverResponse && serverResponse.valid === true) return { valid: true };

    if (serverResponse && serverResponse.valid === false) {
      localStorage.removeItem("token");
      localStorage.removeItem("auth");
      localStorage.removeItem("userProfile");
      return { valid: false };
    }

    // Fallback to local expiry check
    const parts = token.split(".");
    if (parts.length < 2) {
      localStorage.removeItem("token");
      localStorage.removeItem("auth");
      localStorage.removeItem("userProfile");
      return { valid: false };
    }

    try {
      const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = payloadB64.length % 4 === 0 ? 0 : 4 - (payloadB64.length % 4);
      const padded = payloadB64 + "=".repeat(pad);
      const json = atob(padded);
      const payload = JSON.parse(json || "{}");
      const exp = Number(payload.exp || 0);
      const now = Math.floor(Date.now() / 1000);
      if (!exp || exp <= now) {
        localStorage.removeItem("token");
        localStorage.removeItem("auth");
        localStorage.removeItem("userProfile");
        return { valid: false };
      }
      return { valid: true };
    } catch (e) {
      localStorage.removeItem("token");
      localStorage.removeItem("auth");
      localStorage.removeItem("userProfile");
      return { valid: false };
    }
  } catch (e) {
    localStorage.removeItem("token");
    localStorage.removeItem("auth");
    localStorage.removeItem("userProfile");
    return { valid: false };
  }
}

function ProtectedRoute({ children }) {
  const { showLoading, hideLoading } = useLoading();
  const [isAuth, setIsAuth] = useState(null);
  const ssoEnabled = import.meta.env.VITE_ENABLE_SSO !== 'false';

  useEffect(() => {
    async function checkAuth() {
      showLoading();
      try {
        // Capture redirect and app parameters from URL before any redirect
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get('redirect');
        const appParam = urlParams.get('app');
        
        // Store parameters if provided
        if (redirectUrl) {
          sessionStorage.setItem('redirect_after_login', redirectUrl);
          localStorage.setItem('redirect_after_login', redirectUrl);
        }
        if (appParam) {
          sessionStorage.setItem('app_after_login', appParam);
          localStorage.setItem('app_after_login', appParam);
        }

        if (ssoEnabled) {
          // Initialize Keycloak
          await initKeycloak({
            onLoad: 'check-sso',
            checkLoginIframe: false,
          });

          // Check if authenticated with Keycloak
          if (isAuthenticated()) {
            // Try to update token if needed
            try {
              await updateToken(30);
            } catch (e) {
              console.log('Token refresh not needed or failed');
            }
            
            // Check app token validity
            const tokenStatus = await isTokenValid();
            setIsAuth(tokenStatus);
            
            // Check if user not found (404)
            if (tokenStatus.userNotFound) {
              // Don't redirect, let component handle it
              return;
            }
            
            if (!tokenStatus.valid) {
              // Redirect to login
              login();
            }
          } else {
            // Not authenticated, redirect to login
            setIsAuth({ valid: false });
            login();
          }
        } else {
          // SSO disabled, use regular token check
          const tokenStatus = await isTokenValid();
          setIsAuth(tokenStatus);
        }
      } catch (e) {
        console.error('[ProtectedRoute] checkAuth error', e);
        setIsAuth({ valid: false });
      } finally {
        hideLoading();
      }
    }

    checkAuth();
  }, [showLoading, hideLoading, ssoEnabled]);

  if (isAuth === null) {
    return null; // Loading...
  }

  // Handle user not found case - redirect to user-not-found page
  if (isAuth.userNotFound) {
    return <Navigate to="/user-not-found" replace />;
  }

  if (!isAuth.valid) {
    if (ssoEnabled) {
      return null; // Will redirect to Keycloak
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
