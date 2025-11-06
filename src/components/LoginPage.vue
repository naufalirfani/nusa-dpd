<template>
  <!-- Fullscreen container to center the card regardless of #app layout/padding -->
  <div class="items-center justify-center bg-gray-50 transition-colors">
    <div class="max-w-md mx-4">
      <div
        class="bg-white shadow-lg rounded-lg p-8 sm:p-10 border border-gray-100"
      >
        <div class="flex items-center justify-center mb-2">
          <img :src="logo" alt="Logo" class="h-20 w-auto" />
        </div>
        <h1 class="text-3xl font-bold text-gray-800 text-center mb-6 !mt-0">
          NUSA DPD RI
        </h1>
        <h1 class="text-2xl font-semibold text-gray-800 text-center mb-2">
          {{ t("title") }}
        </h1>
        <p class="text-sm text-gray-500 text-center mb-6">
          {{ t("subtitle") }}
        </p>

        <form @submit.prevent="onSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >NIP</label
            >
            <input
              v-model="nip"
              @input="onNipInput"
              type="text"
              inputmode="numeric"
              maxlength="18"
              class="w-full px-4 py-2 rounded-md border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="e.g. 198001012000"
            />
            <p v-if="nipError" class="mt-1 text-sm text-red-600">
              {{ nipError }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{
              t("code")
            }}</label>
            <div class="flex gap-2 items-center justify-center mb-2">
              <canvas
                ref="captchaCanvas"
                width="140"
                height="44"
                class="rounded-md border border-gray-200"
                title="Click to refresh"
                @click="generateCode"
                aria-label="Captcha image showing verification code"
              ></canvas>
              <button
                type="button"
                @click="sendCode"
                :title="t('refresh')"
                aria-label="Refresh verification code"
                :disabled="sending || nip.length !== 18"
                class="p-2 rounded-md bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center transform transition-transform duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <template v-if="sending">
                  <!-- spinner -->
                  <svg
                    class="w-4 h-4 animate-spin"
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
                </template>
                <template v-else>
                  <!-- refresh icon -->
                  <svg
                    class="w-4 h-4 transform transition-transform duration-200 hover:rotate-90"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                  >
                    <path
                      d="M21 12.79A9 9 0 1111.21 3"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M21 3v6h-6"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </template>
              </button>
            </div>
            <div class="flex gap-2 items-center justify-center mb-2">
              <input
                v-model="code"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                class="flex-1 px-4 py-2 rounded-md border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="123456"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              :disabled="loading"
              aria-busy="loading"
              class="w-full px-4 py-2 rounded-md bg-teal-500 hover:bg-teal-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <template v-if="loading">
                <svg
                  class="w-4 h-4 animate-spin inline-block mr-2"
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
                {{ t("login") }}...
              </template>
              <template v-else>
                {{ t("login") }}
              </template>
            </button>
          </div>
        </form>

        <div
          class="mt-6 flex items-center justify-between text-sm text-gray-500"
        >
          <div class="relative" ref="dropdownRef">
            <!-- Custom dropdown: shows flag + label -->
            <button
              @click="toggleDropdown"
              @keydown.enter.prevent="toggleDropdown"
              type="button"
              class="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-md bg-white hover:shadow-sm focus:outline-none"
            >
              <span class="text-sm font-medium text-gray-700">{{
                locale === "id" ? t("lang_id") : t("lang_en")
              }}</span>
              <svg
                class="w-4 h-4 ml-1 text-gray-400"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M6 8l4 4 4-4"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>

            <transition name="fade">
              <ul
                v-if="open"
                class="absolute left-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10"
              >
                <li>
                  <button
                    @click="selectLocale('id')"
                    type="button"
                    class="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <div
                      class="w-6 h-5 rounded-sm overflow-hidden ring-1 ring-gray-200/50 mr-3"
                    >
                      <img
                        src="https://flagcdn.com/w40/id.png"
                        alt="Indonesia"
                        class="w-full h-full object-cover"
                      />
                    </div>
                    <span class="text-sm text-gray-700"
                      >{{ t("lang_id") }} — Indonesian</span
                    >
                  </button>
                </li>
                <li>
                  <button
                    @click="selectLocale('en')"
                    type="button"
                    class="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <div
                      class="w-6 h-5 rounded-sm overflow-hidden ring-1 ring-gray-200/50 mr-3"
                    >
                      <img
                        src="https://flagcdn.com/w40/gb.png"
                        alt="English"
                        class="w-full h-full object-cover"
                      />
                    </div>
                    <span class="text-sm text-gray-700"
                      >{{ t("lang_en") }} — English</span
                    >
                  </button>
                </li>
              </ul>
            </transition>
          </div>
          <div class="text-xs">v1.0</div>
        </div>

        <!-- Copyright line below the login card -->
        <div class="mt-4 text-center text-xs text-gray-500">
          © 2025. BPSDM. All rights reserved.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "../i18n";
import logoPath from "../assets/logo.png";
// token generation is delegated to the SSO backend endpoint

const { t, locale: i18nLocale } = useI18n();

const nip = ref("");
const code = ref("");
const sending = ref(false);
const loading = ref(false);
const locale = ref(i18nLocale.value);
const router = useRouter();
const nipError = ref("");

const logo = logoPath;

// Custom dropdown state
const open = ref(false);
const dropdownRef = ref(null);

// verification code for anti-bot (drawn as obfuscated image)
const verificationCode = ref("");
const captchaCanvas = ref(null);

function generateCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  verificationCode.value = out;
  drawCaptcha();
}

function onNipInput(e) {
  // allow digits only and limit to 18
  const cleaned = (e.target.value || "").replace(/\D/g, "").slice(0, 18);
  nip.value = cleaned;
  // clear inline error when user types to valid length
  if (nip.value.length === 18) nipError.value = "";
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// The token is generated by the backend SSO endpoint. This avoids doing any
// signing in the browser and keeps the client simple.
const JWT_EXPIRES = parseInt(import.meta.env.VITE_JWT_EXPIRES, 10) || 3600;
const SSO_BASE = import.meta.env.VITE_CMB_BASE || "";

async function createJwt(payload = {}, expiresInSeconds = 3600) {
  // The SSO endpoint expects the NIP in the path. We call it and return the
  // token string. The endpoint may return JSON { token: '...' } or plain text.
  if (!SSO_BASE)
    throw new Error("SSO base URL (VITE_CMB_BASE) is not configured");
  const nip = payload && payload.nip ? payload.nip : "";
  if (!nip) throw new Error("NIP is required to generate token");

  // Use a dev proxy path when running in development to avoid CORS issues.
  const url = `/cmb-sso/generate/${encodeURIComponent(
    nip
  )}?exp_minutes=${Math.ceil(expiresInSeconds / 60)}&token=${
    import.meta.env.VITE_SSO_GENERATE_TOKEN
  }`;
  const res = await fetch(url, { method: "GET", credentials: "include" });

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

function drawCaptcha() {
  const canvas = captchaCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  // background
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, w, h);

  // noise lines
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(rand(0, w), rand(0, h));
    ctx.lineTo(rand(0, w), rand(0, h));
    ctx.strokeStyle = `rgba(${rand(100, 180)},${rand(100, 180)},${rand(
      100,
      180
    )},${(Math.random() * 0.4 + 0.2).toFixed(2)})`;
    ctx.lineWidth = Math.random() * 1.5 + 0.5;
    ctx.stroke();
  }

  // draw characters with rotation and varying style
  const text = verificationCode.value || "";
  const charSpace = w / (text.length + 1);
  for (let i = 0; i < text.length; i++) {
    const chr = text.charAt(i);
    const fontsize = rand(18, 26);
    const x = charSpace * (i + 0.6);
    const y = rand(h - 10, h - 8);
    const angle = (Math.random() - 0.5) * 0.6;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.font = `${fontsize}px monospace`;
    ctx.fillStyle = `rgba(${rand(20, 80)},${rand(20, 80)},${rand(20, 80)},${(
      Math.random() * 0.6 +
      0.4
    ).toFixed(2)})`;
    ctx.fillText(chr, -fontsize / 2, 0);
    ctx.restore();
  }

  // dots
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${rand(0, 200)},${rand(0, 200)},${rand(0, 200)},${(
      Math.random() * 0.6
    ).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(rand(0, w), rand(0, h), Math.random() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function toggleDropdown() {
  open.value = !open.value;
}

function selectLocale(code) {
  locale.value = code;
  i18nLocale.value = code;
  try {
    localStorage.setItem("locale", code);
    document.documentElement.lang = code;
  } catch (e) {
    /* ignore */
  }
  open.value = false;
}

function onDocClick(e) {
  if (!dropdownRef.value) return;
  if (!dropdownRef.value.contains(e.target)) open.value = false;
}

onMounted(() => {
  document.addEventListener("click", onDocClick);
  // initialize verification code
  generateCode();
});
onBeforeUnmount(() => document.removeEventListener("click", onDocClick));

function sendCode() {
  if (!nip.value) {
    if (typeof Swal !== "undefined")
      Swal.fire({ icon: "warning", title: t("enter_nip") });
    else alert(t("enter_nip"));
    return;
  }
  if (nip.value.length !== 18) {
    if (typeof Swal !== "undefined")
      Swal.fire({ icon: "warning", title: t("invalid_nip") });
    else alert(t("invalid_nip"));
    return;
  }
  sending.value = true;
  setTimeout(() => {
    generateCode();
    sending.value = false;
    if (typeof Swal !== "undefined")
      Swal.fire({ icon: "success", title: t("code_generated") });
    else alert(t("code_generated"));
  }, 400);
}

function onSubmit() {
  if (!nip.value) {
    if (typeof Swal !== "undefined")
      Swal.fire({ icon: "warning", title: t("enter_nip") });
    else alert(t("enter_nip"));
    return;
  }
  if (nip.value.length !== 18) {
    nipError.value = t("invalid_nip");
    if (typeof Swal !== "undefined")
      Swal.fire({ icon: "warning", title: t("invalid_nip") });
    else alert(t("invalid_nip"));
    return;
  }
  if (!code.value) {
    if (typeof Swal !== "undefined")
      Swal.fire({ icon: "warning", title: t("enter_code") });
    else alert(t("enter_code"));
    return;
  }
  if (
    code.value.trim().toUpperCase() ===
    (verificationCode.value || "").toUpperCase()
  ) {
    // on success: create JWT containing NIP, store it, then navigate
    const doSuccess = async () => {
      loading.value = true;
      try {
        const token = await createJwt({ nip: nip.value }, JWT_EXPIRES);
        try {
          localStorage.setItem("token", token);
        } catch (e) {}
        try {
          localStorage.setItem("auth", "1");
        } catch (e) {}
        // token stored (debug logging removed)
      } catch (err) {
        // fallback: still set auth flag and notify user
        try {
          localStorage.setItem("auth", "1");
        } catch (e) {}
  // createJwt failed (handled via UI); debug logging removed
        if (typeof Swal !== "undefined") {
          try {
            await Swal.fire({
              icon: "warning",
              title: t("verify_success"),
              text:
                t("token_generate_failed") ||
                "Token generation failed — continuing in demo mode.",
            });
          } catch (e) {}
        }
      } finally {
        loading.value = false;
      }
      nipError.value = "";
      // use replace to avoid back navigation causing unexpected behavior across hosts
      try {
        router.replace("/dashboard");
      } catch (e) {
        router.push("/dashboard");
      }
    };

    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "success",
        title: t("verify_success"),
        showConfirmButton: false,
        timer: 900,
      }).then(doSuccess);
    } else {
      doSuccess();
    }
  } else {
    if (typeof Swal !== "undefined")
      Swal.fire({ icon: "error", title: t("verify_fail") });
    else alert(t("verify_fail"));
  }
}

function changeLocale() {
  i18nLocale.value = locale.value;
  try {
    localStorage.setItem("locale", locale.value);
    document.documentElement.lang = locale.value;
  } catch (e) {
    /* ignore */
  }
}
</script>

<style scoped>
/* Small tweak to keep inputs same height in light */
input::placeholder {
  color: rgba(107, 114, 128, 0.5);
}

/* simple fade transition for dropdown */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}
</style>
