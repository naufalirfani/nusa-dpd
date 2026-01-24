import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const VITE_PORT = env.VITE_PORT || process.env.VITE_PORT || '5173';
  const WINDOWS_WATCH = env.WINDOWS_WATCH || process.env.WINDOWS_WATCH;

  return {
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: true,
      port: Number(VITE_PORT) || 5173,
      strictPort: false,
      watch: {
        ...(WINDOWS_WATCH ? { usePolling: true } : {}),
      },
    },
  };
});
