# nusa-dpd

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) 
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Environment Configuration

This project supports two modes for API calls:

#### Development Mode (with Vite Proxy)
In development, the app uses Vite's proxy feature to avoid CORS issues. Set `VITE_DEV=true` in your `.env` file:

```env
VITE_DEV=true
VITE_CMB_BASE=http://localhost:8000
VITE_DPD_PORTAL_BASE=https://okk.dpd.go.id
VITE_DAYOFF_API_BASE=https://dayoffapi.vercel.app/api
```

All API calls will use relative paths (`/cmb/...`, `/dpd-portal/...`, `/dayoffapi/...`) which are proxied by Vite.

#### Production Mode (Direct API Calls)
In production, set `VITE_DEV=false` to make direct API calls to the configured base URLs. **This eliminates the need to configure reverse proxy in nginx or apache.**

```env
VITE_DEV=false
VITE_CMB_BASE=https://api.yourdomain.com
VITE_DPD_PORTAL_BASE=https://okk.dpd.go.id
VITE_DAYOFF_API_BASE=https://dayoffapi.vercel.app/api
```

Create a `.env.production` file with production values, or set these as environment variables during build.

**Important:** Make sure your backend APIs support CORS if using direct API calls, or deploy the frontend and backend on the same domain.

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

The build output will be in the `dist/` directory. Deploy this folder to your web server.
