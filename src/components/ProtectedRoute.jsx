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
    return false;
  }
}

async function isTokenValid() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return false;

    const serverOk = await verifyTokenWithSso(token);
    if (serverOk === true) return true;

    if (serverOk === false) {
      localStorage.removeItem("token");
      localStorage.removeItem("auth");
      localStorage.removeItem("userProfile");
      return false;
    }

    // Fallback to local expiry check
    const parts = token.split(".");
    if (parts.length < 2) {
      localStorage.removeItem("token");
      localStorage.removeItem("auth");
      localStorage.removeItem("userProfile");
      return false;
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
        return false;
      }
      return true;
    } catch (e) {
      localStorage.removeItem("token");
      localStorage.removeItem("auth");
      localStorage.removeItem("userProfile");
      return false;
    }
  } catch (e) {
    localStorage.removeItem("token");
    localStorage.removeItem("auth");
    localStorage.removeItem("userProfile");
    return false;
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
            const valid = await isTokenValid();
            setIsAuth(valid);
            
            if (!valid) {
              // Redirect to login
              login();
            }
          } else {
            // Not authenticated, redirect to login
            setIsAuth(false);
            login();
          }
        } else {
          // SSO disabled, use regular token check
          const valid = await isTokenValid();
          setIsAuth(valid);
        }
      } catch (e) {
        console.error('[ProtectedRoute] checkAuth error', e);
        setIsAuth(false);
      } finally {
        hideLoading();
      }
    }

    checkAuth();
  }, [showLoading, hideLoading, ssoEnabled]);

  if (isAuth === null) {
    return null; // Loading...
  }

  if (!isAuth) {
    if (ssoEnabled) {
      return null; // Will redirect to Keycloak
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
