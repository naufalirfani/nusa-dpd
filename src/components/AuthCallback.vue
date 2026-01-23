<template>
  <div class="min-h-screen overflow-hidden">
    <!-- Animated gradient background matching LoginPage -->
    <div
      class="absolute inset-0 -z-10 animate-gradient bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-200 via-sky-100 to-white"
    ></div>

    <!-- Centered loading state -->
    <div class="flex min-h-screen items-center justify-center px-6">
      <div class="w-full max-w-md text-center">
        <!-- Glassmorphism card -->
        <div
          class="rounded-3xl bg-gradient-to-br from-white/80 to-white/40 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur-xl"
        >
          <!-- Loading spinner -->
          <div class="mb-6 flex justify-center">
            <svg
              class="h-16 w-16 animate-spin text-teal-500"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
          </div>

          <h2 class="text-2xl font-semibold text-gray-800">
            {{ t("processing_auth") }}
          </h2>
          <p class="mt-2 text-gray-600">
            {{ t("please_wait") }}
          </p>

          <!-- Error state -->
          <div v-if="error" class="mt-6">
            <div
              class="rounded-xl bg-rose-50 p-4 ring-1 ring-rose-200"
            >
              <p class="text-sm font-medium text-rose-800">{{ error }}</p>
            </div>
            <button
              @click="redirectToLogin"
              class="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 px-6 py-3 font-medium text-white shadow-sm transition hover:from-teal-600 hover:to-sky-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              {{ t("back_to_login") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "../i18n";
import {
  exchangeCodeForToken,
  getUserInfo,
  extractIdentifier,
} from "../config/keycloak";
import { getCmbApiUrl } from "../config/api";
import { encryptTokenForHeader } from "../utils/crypto";

const { t } = useI18n();
const router = useRouter();
const error = ref("");

const JWT_EXPIRES = parseInt(import.meta.env.VITE_JWT_EXPIRES, 10) || 3600;

/**
 * Create JWT token by calling the SSO generate endpoint
 * Same as LoginPage.vue createJwt function
 */
async function createJwt(payload = {}, expiresInSeconds = 3600) {
  const identifierVal =
    payload && (payload.identifier || payload.nip)
      ? payload.identifier || payload.nip
      : "";
  if (!identifierVal)
    throw new Error("Identifier (NIP or email) is required to generate token");

  const params = new URLSearchParams();
  params.set("exp_minutes", String(Math.ceil(expiresInSeconds / 60)));

  const ssoToken = import.meta.env.VITE_SSO_GENERATE_TOKEN || "";
  const headers = {};
  if (ssoToken) {
    headers["X-Api-Token"] = await encryptTokenForHeader(ssoToken, {
      salt: ssoToken,
    });
  }

  const url = getCmbApiUrl(
    `/sso/generate/${encodeURIComponent(identifierVal)}?${params.toString()}`
  );

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to generate token: ${res.status} ${res.statusText} ${text}`
    );
  }

  const ct = res.headers.get("content-type") || "";
  let token;

  if (ct.includes("application/json")) {
    const j = await res.json().catch(() => ({}));
    token = j && (j.token || j.access_token || j.data || j);
    if (typeof token === "object" && token !== null)
      token = token.token || token.access_token || "";
  } else {
    token = await res.text().catch(() => "");
  }
  if (!token) throw new Error("SSO did not return a token");
  return token.toString();
}

/**
 * Process the OAuth callback
 */
async function handleCallback() {
  try {
    // Get authorization code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const errorParam = urlParams.get("error");
    const errorDescription = urlParams.get("error_description");

    // Check for errors from Keycloak
    if (errorParam) {
      throw new Error(
        errorDescription || `Authentication error: ${errorParam}`
      );
    }

    if (!code) {
      throw new Error("No authorization code received from Keycloak");
    }

    // Step 1: Exchange code for tokens
    const tokenResponse = await exchangeCodeForToken(code);

    // Step 2: Get user information
    const userInfo = await getUserInfo(tokenResponse.access_token);

    // Step 3: Extract NIP or email from user info
    const identifier = extractIdentifier(userInfo);

    if (!identifier) {
      throw new Error("Could not extract NIP or email from user info");
    }

    // Step 4: Generate application JWT using the existing endpoint
    const appToken = await createJwt({ identifier }, JWT_EXPIRES);

    // Step 5: Store tokens
    try {
      localStorage.setItem("token", appToken);
      localStorage.setItem("auth", "1");
      // Optionally store Keycloak tokens for logout
      localStorage.setItem("keycloak_access_token", tokenResponse.access_token);
      if (tokenResponse.id_token) {
        localStorage.setItem("keycloak_id_token", tokenResponse.id_token);
      }
      if (tokenResponse.refresh_token) {
        localStorage.setItem("keycloak_refresh_token", tokenResponse.refresh_token);
      }
    } catch (e) {
      console.error("Failed to store tokens:", e);
    }

    // Step 6: Redirect to dashboard
    router.replace("/dashboard");
  } catch (err) {
    console.error("Auth callback error:", err);
    error.value = err.message || "Authentication failed";
    
    // Show error notification if Swal is available
    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "error",
        title: t("auth_failed") || "Authentication Failed",
        text: error.value,
        confirmButtonText: t("back_to_login") || "Back to Login",
      }).then(() => {
        redirectToLogin();
      });
    }
  }
}

function redirectToLogin() {
  // Clear any partial authentication state
  try {
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("keycloak_access_token");
    localStorage.removeItem("keycloak_id_token");
    localStorage.removeItem("keycloak_refresh_token");
  } catch (e) {
    /* ignore */
  }
  
  // Redirect back to home/login (which will trigger SSO redirect again)
  router.replace("/");
}

onMounted(() => {
  handleCallback();
});
</script>

<style scoped>
@keyframes gradientMove {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
  100% {
    transform: translateY(0);
  }
}
.animate-gradient {
  animation: gradientMove 12s ease-in-out infinite;
}
</style>
