import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // Enable LAN access so the dev server can be reached via the machine IP
  // You can also run `npm run dev` with `--host` which has the same effect.
  server: {
    // `true` makes the server listen on all addresses (0.0.0.0)
    host: true,
    // pick port from VITE_PORT or fallback to 5173
    port: Number(process.env.VITE_PORT) || 5173,
    // allow falling back to another port if 5173 is busy
    strictPort: false,
    // on some Windows setups or WSL, file watching may require polling
    // enable by setting the env var WINDOWS_WATCH=1 if you notice missing HMR updates
    watch: {
      ...(process.env.WINDOWS_WATCH ? { usePolling: true } : {})
    },
    // Proxy external API to avoid CORS during development.
    // Requests to /dpd-portal/... will be forwarded to https://okk.dpd.go.id/dpd-portal/...
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
      '/cmb-sso': {
        target: process.env.VITE_CMB_BASE || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/cmb-sso/, '/sso'),
      },
    },
  },
})
