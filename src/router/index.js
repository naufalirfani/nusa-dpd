import { createRouter, createWebHistory } from "vue-router";
import LoginPage from "../components/LoginPage.vue";
import Dashboard from "../components/Dashboard.vue";
import NotFound from "../components/NotFound.vue";
import { showLoading, hideLoading } from '@/stores/loading'

// The router now delegates token verification to the SSO backend verify endpoint
// to avoid doing cryptographic verification in the browser.
const SSO_BASE = import.meta.env.VITE_CMB_BASE || "";

async function verifyTokenWithSso(token) {
  if (!SSO_BASE) {
    // No SSO base configured — fall back to optimistic local expiry check
    // debug log removed
    return null; // signal that caller should fallback to local check
  }

    // Always call the same-origin verify proxy path. In development Vite will
    // forward `/cmb-sso` to the configured backend; in production nginx will
    // proxy it to the SSO backend. If the request fails we fall back to local
    // expiry verification.
    const url = `/cmb-sso/verify/${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, { method: "GET", credentials: "include" });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const j = await res.json().catch(() => ({}));
      // Accept { status: true } as valid
      if (j && (j.status === true || j.valid === true)) return true;
      return false;
    }
    // Non-JSON: consider HTTP 200 as valid (legacy behavior)
    return true;
  } catch (e) {
    console.error("[router] verifyTokenWithSso error", e);
    return false;
  }
}

async function isTokenValid() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return false;
    // Prefer server-side verification when possible
    const serverOk = await verifyTokenWithSso(token);
    if (serverOk === true) return true;

    // If server verification explicitly failed, clear auth
    if (serverOk === false) {
      try {
        localStorage.removeItem("token");
      } catch (e) {}
      try {
        localStorage.removeItem("auth");
      } catch (e) {}
      try {
        localStorage.removeItem("userProfile");
      } catch (e) {}
      return false;
    }

    // serverOk === null means no SSO base configured — fall back to local expiry check
    // decode payload without jsonwebtoken (base64url decode)
    const parts = token.split(".");
    if (parts.length < 2) {
      try {
        localStorage.removeItem("token");
      } catch (e) {}
      try {
        localStorage.removeItem("auth");
      } catch (e) {}
      try {
        localStorage.removeItem("userProfile");
      } catch (e) {}
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
        try {
          localStorage.removeItem("token");
        } catch (e) {}
        try {
          localStorage.removeItem("auth");
        } catch (e) {}
        try {
          localStorage.removeItem("userProfile");
        } catch (e) {}
        return false;
      }
      return true;
    } catch (e) {
      try {
        localStorage.removeItem("token");
      } catch (e) {}
      try {
        localStorage.removeItem("auth");
      } catch (e) {}
      try {
        localStorage.removeItem("userProfile");
      } catch (e) {}
      return false;
    }
  } catch (e) {
    try {
      localStorage.removeItem("token");
    } catch (e) {}
    try {
      localStorage.removeItem("auth");
    } catch (e) {}
    try {
      localStorage.removeItem("userProfile");
    } catch (e) {}
    return false;
  }
}

const routes = [
  { path: "/", name: "Login", component: LoginPage },
  { path: "/dashboard", name: "Dashboard", component: Dashboard },
];

// catch-all 404 route
routes.push({
  path: "/:pathMatch(.*)*",
  name: "NotFound",
  component: NotFound,
});

// Normalize BASE_URL: Vite's BASE_URL should be a pathname (e.g. '/'),
// but if a full origin (http://host:port/) is provided in .env, extract the pathname.
let rawBase = import.meta.env.BASE_URL || "/";
let routerBase = rawBase;
try {
  if (/^https?:\/\//i.test(rawBase)) {
    // extract pathname from full URL
    const u = new URL(rawBase);
    routerBase = u.pathname || "/";
  }
} catch (e) {
  routerBase = "/";
}
// router base determined (debug logging removed)

const router = createRouter({
  history: createWebHistory(routerBase),
  routes,
});

router.beforeEach(async (to, from, next) => {
  showLoading();
  try {
    // If user navigates to the root (login) and already has a valid token, send them to dashboard.
    const ok = await isTokenValid();
    if (to.path === "/") {
      // navigating to / — token check performed (debug logging removed)
      if (ok) return next({ path: "/dashboard" });
    }

    // If user navigates to protected route, ensure token is present, signature valid and not expired.
    if (to.path !== "/") {
      // protected route — token validity checked (debug logging removed)
      if (!ok) return next({ path: "/" });
    }

    // If token exists but expired/invalid while navigating elsewhere, clear it and redirect to login.
    const tokenExists = !!localStorage.getItem("token");
    if (tokenExists) {
      // token exists — revalidation performed (debug logging removed)
      if (!ok && to.path !== "/") return next({ path: "/" });
    }

    next();
  } finally {
    hideLoading();
  }
});

export default router;
