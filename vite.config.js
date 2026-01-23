import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` (development/production). This allows VITE_*
  // variables in `.env` to be available here via `env`.
  const env = loadEnv(mode, process.cwd(), '');
  // Prefer env loaded by Vite (.env), fall back to process.env (useful for
  // Docker build args that set VITE_* via ARG/ENV).
  const VITE_PORT = env.VITE_PORT || process.env.VITE_PORT || '5173';
  const VITE_CMB_BASE = env.VITE_CMB_BASE || process.env.VITE_CMB_BASE || 'http://localhost:8000';
  const WINDOWS_WATCH = env.WINDOWS_WATCH || process.env.WINDOWS_WATCH;
  const VITE_DEV = env.VITE_DEV || process.env.VITE_DEV || 'true';
  
  // Only use proxy in development mode (VITE_DEV=true)
  // In production (VITE_DEV=false), app will make direct API calls
  const useProxy = VITE_DEV === 'true' || command === 'serve';

  return {
    plugins: [
      vue(),
      // vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // Enable LAN access so the dev server can be reached via the machine IP
    // You can also run `npm run dev` with `--host` which has the same effect.
    server: {
      // `true` makes the server listen on all addresses (0.0.0.0)
      host: true,
      // pick port from VITE_PORT or fallback to 5173
      port: Number(VITE_PORT) || 5173,
      // allow falling back to another port if 5173 is busy
      strictPort: false,
      // on some Windows setups or WSL, file watching may require polling
      // enable by setting the env var WINDOWS_WATCH=1 if you notice missing HMR updates
      watch: {
        ...(WINDOWS_WATCH ? { usePolling: true } : {}),
      },
      // Proxy external API to avoid CORS during development.
      // Only enabled when VITE_DEV=true. In production (VITE_DEV=false),
      // the app makes direct API calls using absolute URLs from src/config/api.js
      ...(useProxy ? {
        proxy: {
          '/dpd-portal': {
            target: 'https://okk.dpd.go.id',
            changeOrigin: true,
            secure: false,
            // keep path as-is; Vite will forward /dpd-portal/openapi/... to target/dpd-portal/openapi/...
          },
        // Local proxy for SSO endpoints to avoid CORS when the SSO server is on a
        // different origin. During development the client will call /cmb-sso/...
        // which will be forwarded to the configured VITE_CMB_BASE + /sso/...
        '/cmb': {
          target: VITE_CMB_BASE,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/cmb/, ''),
        },
        '/dayoffapi': {
          target: 'https://dayoffapi.vercel.app/api',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/dayoffapi/, ''),
        },
        // Keycloak SSO proxy to avoid CORS in development
        '/keycloak': {
          target: env.VITE_KEYCLOAK_BASE_URL || 'https://auth.dpd.go.id/realms/dpd-sso/protocol/openid-connect',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/keycloak/, ''),
        },
      }
      } : {}),
    },
  };
});
