import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../components/LoginPage.vue'
import Dashboard from '../components/Dashboard.vue'
import NotFound from '../components/NotFound.vue'

// Read secret from Vite env (client-side demo). Must match what was used to sign the JWT.
const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || '';

function base64UrlDecode(input) {
  try {
    let str = input.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return atob(str);
  } catch (e) {
    return null;
  }
}

function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function verifySignature(token, secret) {
  if (!secret) return false;
  // If SubtleCrypto is not available (insecure context like http on LAN IP),
  // skip signature verification in dev so routing/auth can proceed.
  if (typeof window === 'undefined' || !window.crypto || !crypto.subtle) {
    try { console.warn('[router] SubtleCrypto unavailable — skipping signature verification (dev)'); } catch (e) {}
    return true;
  }
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const signingInput = `${parts[0]}.${parts[1]}`;
    const signatureB64 = parts[2];
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
    const computed = arrayBufferToBase64Url(sig);
    return computed === signatureB64;
  } catch (e) {
    return false;
  }
}

async function isTokenValid() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return false;

    // verify signature matches secret from env
    const sigOk = await verifySignature(token, JWT_SECRET);
    if (!sigOk) {
      try { localStorage.removeItem('token'); } catch (e) {}
      try { localStorage.removeItem('auth'); } catch (e) {}
      return false;
    }

    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payloadB64 = parts[1];
    const payloadJson = base64UrlDecode(payloadB64);
    if (!payloadJson) return false;
    const payload = JSON.parse(payloadJson);
    const exp = Number(payload.exp || 0);
    const now = Math.floor(Date.now() / 1000);
    if (!exp || exp <= now) {
      // expired - clear token/auth
      try { localStorage.removeItem('token'); } catch (e) {}
      try { localStorage.removeItem('auth'); } catch (e) {}
      return false;
    }
    return true;
  } catch (e) {
    try { localStorage.removeItem('token'); } catch (e) {}
    try { localStorage.removeItem('auth'); } catch (e) {}
    return false;
  }
}

const routes = [
  { path: '/', name: 'Login', component: LoginPage },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard }
]

// catch-all 404 route
routes.push({ path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound })

// Normalize BASE_URL: Vite's BASE_URL should be a pathname (e.g. '/'),
// but if a full origin (http://host:port/) is provided in .env, extract the pathname.
let rawBase = import.meta.env.BASE_URL || '/';
let routerBase = rawBase;
try {
  if (/^https?:\/\//i.test(rawBase)) {
    // extract pathname from full URL
    const u = new URL(rawBase);
    routerBase = u.pathname || '/';
  }
} catch (e) {
  routerBase = '/';
}
console.debug('[router] using base:', JSON.stringify(routerBase));

const router = createRouter({
  history: createWebHistory(routerBase),
  routes,
})

router.beforeEach(async (to, from, next) => {
  // If user navigates to the root (login) and already has a valid token, send them to dashboard.
  if (to.path === '/') {
    const ok = await isTokenValid();
    console.debug('[router] navigating to /, token valid?', ok);
    if (ok) return next({ path: '/dashboard' });
  }

  // If user navigates to protected route, ensure token is present, signature valid and not expired.
  if (to.path !== '/') {
    const ok = await isTokenValid();
    console.debug('[router] protected route', to.path, 'token valid?', ok);
    if (!ok) return next({ path: '/' });
  }

  // If token exists but expired/invalid while navigating elsewhere, clear it and redirect to login.
  const tokenExists = !!localStorage.getItem('token');
  if (tokenExists) {
    const ok = await isTokenValid();
    console.debug('[router] token exists, revalidating ->', ok);
    if (!ok && to.path !== '/') return next({ path: '/' });
  }

  next();
})

export default router
